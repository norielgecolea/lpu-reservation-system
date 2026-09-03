import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { effectiveServices, isFltTech } from '../../../core/auth/roles';
import { UiIcon, UiSegmented, UiDateSelector, UiSelect } from '../../../shared/ui';
import type { UiSelectOption } from '../../../shared/ui';
import { MaintenanceBlock, MaintenanceService } from '../maintenance/maintenance.service';
import { FltReservationsService } from '../reservations/flt/flt-reservations.service';
import { FltReservationRecord } from '../reservations/flt/flt-reservations.models';
import { GymReservationsService } from '../reservations/gymnasium/gymnasium-reservations.service';
import { GymReservationRecord } from '../reservations/gymnasium/gymnasium-reservations.models';
import { NexusReservationsService } from '../reservations/nexus/nexus-reservations.service';
import { NexusReservationRecord } from '../reservations/nexus/nexus-reservations.models';
import { VanReservationsService } from '../reservations/van/van-reservations.service';
import { VanReservationRow } from '../reservations/van/van-reservations.models';
import { EoReservationsService } from '../../eo/eo-reservations.service';
import { EoReservationRecord } from '../../eo/eo-reservations.models';
import { ReservationRealtimeService } from '../reservations/reservation-realtime.service';
import { ReservationAlertService } from '../reservations/reservation-alert.service';
import { DashboardEventSummaryModal } from './dashboard-event-summary-modal';
import { DashboardAnalyticsSection } from './dashboard-analytics-section';
import {
  CalendarDay,
  COORD_EVENT_COLOR,
  DashboardEvent,
  DashboardService,
  DashboardStatKind,
  MAINTENANCE_EVENT_COLOR,
  PENDING_EVENT_COLOR,
  SERVICE_EVENT_COLORS,
  getVanVehicleLegends,
  buildServiceCalendarEvents,
  createCalendarDays,
  dashboardApproverRoute,
  dashboardEventDateBadgeClass,
  dashboardEventDisplayTitle,
  dashboardEventKindBadgeClass,
  dashboardEventKindIcon,
  dashboardEventKindLabel,
  dashboardServiceFilterOptions,
  dashboardServicesFromRoleCodes,
  dashboardStatCardBg,
  eoRecordsToDashboardRecords,
  formatEventDay,
  formatEventMonth,
  getCurrentYearMonth,
  isServiceImplemented,
  reservationStats,
  vanRecordsToDashboardRecords,
  buildCoordinationCalendarEvents,
} from './dashboard-events.util';
import { observePanelHeight } from './dashboard-calendar-layout.util';
import { downloadVanReservationFormFromEvent } from '../reservations/van/van-reservation-form-export.util';
import { downloadGymnasiumReservationFormFromEvent } from '../reservations/gymnasium/gymnasium-reservation-form-export.util';
import { downloadNexusReservationFormFromEvent } from '../reservations/nexus/nexus-reservation-form-export.util';
import { FltCoordinationCalendar, CoordinationSlot } from '../reservations/flt/flt-coordination-calendar';
import { GymnasiumCoordinationCalendar, GymCoordinationSlot } from '../reservations/gymnasium/gymnasium-coordination-calendar';
import { SetCoordinationRequest } from '../reservations/flt/flt-reservations.models';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  cardBg: string;
  loading: boolean;
  kind: DashboardStatKind;
  routerLink: string | null;
  queryParams: { status: string; month: string } | null;
}

const DAYS_PER_WEEK = 7;

@Component({
  selector: 'app-dashboard',
  imports: [
    UiIcon,
    UiSegmented,
    UiSelect,
    UiDateSelector,
    SlicePipe,
    RouterLink,
    DashboardEventSummaryModal,
    DashboardAnalyticsSection,
    FltCoordinationCalendar,
    GymnasiumCoordinationCalendar,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private readonly fltSvc = inject(FltReservationsService);
  private readonly gymSvc = inject(GymReservationsService);
  private readonly nexusSvc = inject(NexusReservationsService);
  private readonly vanSvc = inject(VanReservationsService);
  private readonly eoSvc = inject(EoReservationsService);
  private readonly maintSvc = inject(MaintenanceService);
  private readonly realtime = inject(ReservationRealtimeService);
  private readonly alerts = inject(ReservationAlertService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private wsSub?: Subscription;
  private pollSub?: Subscription;

  /** FLT Tech shell: FLT calendar only, links into /flt-tech approver. */
  protected readonly fltTechMode = computed(
    () =>
      !!this.route.snapshot.data['fltTechContext'] || isFltTech(this.auth.user()?.role),
  );

  /** Services this role may view on the dashboard filter. */
  protected readonly allowedServices = computed<DashboardService[]>(() => {
    if (this.fltTechMode()) return ['FLT'];
    const fromRole = dashboardServicesFromRoleCodes(effectiveServices(this.auth.user()));
    return fromRole.length > 0 ? fromRole : ['FLT'];
  });

  protected readonly loading = signal(true);
  protected readonly fltReservations = signal<FltReservationRecord[]>([]);
  protected readonly gymReservations = signal<GymReservationRecord[]>([]);
  protected readonly nexusReservations = signal<NexusReservationRecord[]>([]);
  protected readonly vanReservations = signal<VanReservationRow[]>([]);
  protected readonly eoReservations = signal<EoReservationRecord[]>([]);
  protected readonly fltMaintenance = signal<MaintenanceBlock[]>([]);
  protected readonly gymMaintenance = signal<MaintenanceBlock[]>([]);
  protected readonly nexusMaintenance = signal<MaintenanceBlock[]>([]);
  protected readonly activeDate = signal(getCurrentYearMonth());
  protected readonly activeService = signal<DashboardService>('FLT');

  protected readonly serviceFilterOptions = computed(() =>
    dashboardServiceFilterOptions(this.allowedServices()),
  );
  protected readonly serviceSelectOptions = computed<UiSelectOption[]>(() =>
    this.serviceFilterOptions().map((o) => ({
      value: o.value,
      label: o.label,
      disabled: o.disabled,
    })),
  );
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly isComingSoon = computed(
    () => !isServiceImplemented(this.activeService()),
  );

  protected readonly eventLegends = computed(() => {
    const service = this.activeService();
    if (this.isComingSoon()) {
      return [{ label: service, className: SERVICE_EVENT_COLORS[service] }];
    }
    if (service === 'Boardroom' || service === 'Conference') {
      return [{ label: service, className: SERVICE_EVENT_COLORS[service] }];
    }
    if (service === 'VAN') {
      return [
        { label: 'Pending', className: PENDING_EVENT_COLOR },
        ...getVanVehicleLegends(this.vanReservations()),
      ];
    }
    return [
      { label: service, className: SERVICE_EVENT_COLORS[service] },
      { label: 'Pending', className: PENDING_EVENT_COLOR },
      { label: 'Coordination', className: COORD_EVENT_COLOR },
      { label: 'Maintenance', className: MAINTENANCE_EVENT_COLOR },
    ];
  });

  protected readonly activeRecords = computed(() => {
    switch (this.activeService()) {
      case 'Gymnasium':
        return this.gymReservations();
      case 'Nexus':
        return this.nexusReservations();
      case 'FLT':
        return this.fltReservations();
      case 'VAN':
        return vanRecordsToDashboardRecords(this.vanReservations());
      case 'Boardroom':
        return eoRecordsToDashboardRecords(
          this.eoReservations().filter((r) => r.roomType === 'BOARDROOM'),
        );
      case 'Conference':
        return eoRecordsToDashboardRecords(
          this.eoReservations().filter((r) => r.roomType === 'CONFERENCE'),
        );
      default:
        return [];
    }
  });

  protected readonly activeMaintenance = computed(() => {
    switch (this.activeService()) {
      case 'Gymnasium':
        return this.gymMaintenance();
      case 'Nexus':
        return this.nexusMaintenance();
      case 'FLT':
        return this.fltMaintenance();
      default:
        return [];
    }
  });

  protected readonly statCards = computed<StatCard[]>(() => {
    const service = this.activeService();
    const stats = reservationStats(this.activeRecords());
    const month = this.activeDate();
    const context = this.fltTechMode() ? 'flt-tech' : 'admin';
    const kinds: Array<{ kind: DashboardStatKind; label: string; value: number; icon: string }> = [
      { kind: 'total', label: `${service} – Total`, value: stats.total, icon: 'monitoring' },
      { kind: 'pending', label: `${service} – Pending`, value: stats.pending, icon: 'pending_actions' },
      { kind: 'approved', label: `${service} – Approved`, value: stats.approved, icon: 'check_circle' },
      { kind: 'rejected', label: `${service} – Rejected/Cancelled`, value: stats.rejected, icon: 'cancel' },
    ];

    return kinds.map(({ kind, label, value, icon }) => {
      // FLT Tech can see pending counts but cannot open the pending queue.
      const clickable = !(this.fltTechMode() && kind === 'pending');
      const routeKind =
        kind === 'total' && this.fltTechMode() ? 'approved' : kind;
      const route = clickable
        ? dashboardApproverRoute(service, routeKind, month, context)
        : null;
      return {
        label,
        value,
        icon,
        kind,
        cardBg: dashboardStatCardBg(service, kind),
        loading: this.loading(),
        routerLink: route?.routerLink ?? null,
        queryParams: route?.queryParams ?? null,
      };
    });
  });

  protected readonly serviceEvents = computed<DashboardEvent[]>(() =>
    buildServiceCalendarEvents(
      this.activeRecords(),
      this.activeMaintenance(),
      this.activeService(),
    ),
  );

  protected readonly calendarDays = computed(() =>
    createCalendarDays(this.activeDate(), this.serviceEvents()),
  );

  protected readonly calendarDateRows = computed(
    () => `repeat(${this.calendarDays().length / DAYS_PER_WEEK}, minmax(min-content, 1fr))`,
  );

  protected readonly upcomingEvents = computed(() =>
    this.serviceEvents()
      .filter(e => e.date.startsWith(this.activeDate()) && e.status !== 'PENDING')
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
  );

  protected readonly formatEventMonth = formatEventMonth;
  protected readonly formatEventDay = formatEventDay;
  protected readonly dashboardEventDateBadgeClass = dashboardEventDateBadgeClass;
  protected readonly dashboardEventDisplayTitle = dashboardEventDisplayTitle;
  protected readonly dashboardEventKindBadgeClass = dashboardEventKindBadgeClass;
  protected readonly dashboardEventKindIcon = dashboardEventKindIcon;
  protected readonly dashboardEventKindLabel = dashboardEventKindLabel;

  protected readonly selectedDayForModal = signal<CalendarDay | null>(null);
  protected readonly selectedEvent = signal<DashboardEvent | null>(null);
  protected readonly calendarPanelHeight = signal<number | null>(null);
  protected readonly coordinationTarget = signal<{
    facility: 'FLT' | 'Gymnasium';
    id: number;
    eventTitle: string;
  } | null>(null);
  protected readonly coordSaving = signal(false);

  protected readonly fltCoordinationEvents = computed(() => {
    const target = this.coordinationTarget();
    if (target?.facility !== 'FLT') return [];
    return buildCoordinationCalendarEvents(this.fltReservations(), target.id);
  });

  protected readonly gymCoordinationEvents = computed(() => {
    const target = this.coordinationTarget();
    if (target?.facility !== 'Gymnasium') return [];
    return buildCoordinationCalendarEvents(this.gymReservations(), target.id);
  });

  protected readonly fltCoordinationInitial = computed<CoordinationSlot | null>(() => {
    const target = this.coordinationTarget();
    if (target?.facility !== 'FLT') return null;
    const row = this.fltReservations().find((r) => r.id === target.id);
    if (!row?.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) return null;
    return {
      date: row.coordinationDate,
      startTime: row.coordinationStartTime,
      endTime: row.coordinationEndTime,
    };
  });

  protected readonly gymCoordinationInitial = computed<GymCoordinationSlot | null>(() => {
    const target = this.coordinationTarget();
    if (target?.facility !== 'Gymnasium') return null;
    const row = this.gymReservations().find((r) => r.id === target.id);
    if (!row?.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) return null;
    return {
      date: row.coordinationDate,
      startTime: row.coordinationStartTime,
      endTime: row.coordinationEndTime,
    };
  });

  @ViewChild('calendarPanel') private calendarPanel?: ElementRef<HTMLElement>;
  private disconnectCalendarHeightObserver?: () => void;

  ngAfterViewInit(): void {
    this.bindCalendarHeightObserver();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.disconnectCalendarHeightObserver?.();
  }

  private bindCalendarHeightObserver(): void {
    this.disconnectCalendarHeightObserver?.();
    this.disconnectCalendarHeightObserver = observePanelHeight(
      this.calendarPanel?.nativeElement,
      height => this.calendarPanelHeight.set(height),
    );
  }

  protected selectDate(value: string): void {
    const previous = this.activeDate();
    this.activeDate.set(value);
    if (previous !== value) {
      this.loadDashboardData();
    }
  }

  protected selectService(value: DashboardService): void {
    if (this.fltTechMode()) return;
    if (!value) return;
    if (!this.allowedServices().includes(value)) return;
    this.activeService.set(value);
  }

  protected openDayModal(day: CalendarDay): void {
    this.selectedDayForModal.set(day);
  }

  protected closeDayModal(): void {
    this.selectedDayForModal.set(null);
  }

  protected openEventSummary(event: DashboardEvent): void {
    this.selectedEvent.set(event);
    this.closeDayModal();
  }

  protected closeEventSummary(): void {
    this.selectedEvent.set(null);
  }

  protected openCoordination(event: DashboardEvent): void {
    if (event.facility !== 'FLT' && event.facility !== 'Gymnasium') return;
    this.closeEventSummary();
    this.coordinationTarget.set({
      facility: event.facility,
      id: event.reservationId,
      eventTitle: event.eventTitle,
    });
  }

  protected closeCoordination(): void {
    this.coordinationTarget.set(null);
    this.coordSaving.set(false);
  }

  protected saveFltCoordination(slot: CoordinationSlot): void {
    this.saveCoordination('FLT', slot);
  }

  protected saveGymCoordination(slot: GymCoordinationSlot): void {
    this.saveCoordination('Gymnasium', slot);
  }

  private saveCoordination(
    facility: 'FLT' | 'Gymnasium',
    slot: CoordinationSlot | GymCoordinationSlot,
  ): void {
    const target = this.coordinationTarget();
    if (!target || target.facility !== facility) return;
    this.coordSaving.set(true);
    const body: SetCoordinationRequest = {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
    const request =
      facility === 'FLT'
        ? this.fltSvc.setCoordination(target.id, body)
        : this.gymSvc.setCoordination(target.id, body);
    request.subscribe({
      next: (res) => {
        this.coordSaving.set(false);
        if (!res.success) return;
        if (facility === 'FLT') {
          this.fltReservations.update((list) =>
            list.map((r) =>
              r.id === target.id
                ? {
                    ...r,
                    coordinationDate: body.date,
                    coordinationStartTime: body.startTime,
                    coordinationEndTime: body.endTime,
                  }
                : r,
            ),
          );
        } else {
          this.gymReservations.update((list) =>
            list.map((r) =>
              r.id === target.id
                ? {
                    ...r,
                    coordinationDate: body.date,
                    coordinationStartTime: body.startTime,
                    coordinationEndTime: body.endTime,
                  }
                : r,
            ),
          );
        }
        this.closeCoordination();
      },
      error: () => this.coordSaving.set(false),
    });
  }

  protected async printVanForm(event: DashboardEvent): Promise<void> {
    try {
      if (event.facility === 'VAN') {
        await downloadVanReservationFormFromEvent(event);
      } else if (event.facility === 'Gymnasium') {
        await downloadGymnasiumReservationFormFromEvent(event);
      } else if (event.facility === 'Nexus') {
        await downloadNexusReservationFormFromEvent(event);
      }
    } catch {
      // no toast on dashboard — modal close is enough
    }
  }

  ngOnInit(): void {
    const allowed = this.allowedServices();
    this.activeService.set(allowed[0] ?? 'FLT');
    this.loadDashboardData();
    this.realtime.ensureConnected();
    this.wsSub = this.realtime.anyUpdates$.subscribe(() => this.loadDashboardData({ quiet: true }));
    this.pollSub = this.realtime.refreshTicks$.subscribe(() => this.loadDashboardData({ quiet: true }));
  }

  private loadDashboardData(opts?: { quiet?: boolean }): void {
    if (!opts?.quiet) this.loading.set(true);
    const month = this.activeDate();
    const allowed = new Set(this.allowedServices());
    const loadFlt = allowed.has('FLT');
    const loadGym = allowed.has('Gymnasium');
    const loadNexus = allowed.has('Nexus');
    const loadVan = allowed.has('VAN');
    const loadEo = allowed.has('Boardroom') || allowed.has('Conference');
    forkJoin({
      flt: loadFlt ? this.fltSvc.getAll({ month }) : of({ reservations: [] as FltReservationRecord[] }),
      gym: loadGym ? this.gymSvc.getAll({ month }) : of({ reservations: [] as GymReservationRecord[] }),
      nexus: loadNexus ? this.nexusSvc.getAll({ month }) : of({ reservations: [] as NexusReservationRecord[] }),
      van: loadVan ? this.vanSvc.getAll({ month }) : of({ reservations: [] as VanReservationRow[] }),
      eo: loadEo ? this.eoSvc.listEvents(month) : of({ reservations: [] as EoReservationRecord[] }),
      fltMaint: loadFlt ? this.maintSvc.getBlocks('FLT') : of({ blocks: [] as MaintenanceBlock[] }),
      gymMaint: loadGym ? this.maintSvc.getBlocks('GYMNASIUM') : of({ blocks: [] as MaintenanceBlock[] }),
      nexusMaint: loadNexus ? this.maintSvc.getBlocks('NEXUS') : of({ blocks: [] as MaintenanceBlock[] }),
    }).subscribe({
      next: ({ flt, gym, nexus, van, eo, fltMaint, gymMaint, nexusMaint }) => {
        const fltRows = flt.reservations ?? [];
        const gymRows = gym.reservations ?? [];
        const nexusRows = nexus.reservations ?? [];
        const vanRows = van.reservations ?? [];
        this.fltReservations.set(fltRows);
        this.gymReservations.set(gymRows);
        this.nexusReservations.set(nexusRows);
        this.vanReservations.set(vanRows);
        this.eoReservations.set(eo.reservations ?? []);
        this.fltMaintenance.set(fltMaint.blocks ?? []);
        this.gymMaintenance.set(gymMaint.blocks ?? []);
        this.nexusMaintenance.set(nexusMaint.blocks ?? []);
        if (loadFlt) this.alerts.watchPending('FLT', fltRows);
        if (loadGym) this.alerts.watchPending('GYMNASIUM', gymRows);
        if (loadNexus) this.alerts.watchPending('NEXUS', nexusRows);
        if (loadVan) this.alerts.watchPending('VAN', vanRows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
