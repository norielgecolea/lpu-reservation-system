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
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { effectiveServices } from '../../../core/auth/roles';
import { UiIcon, UiSegmented, UiDateSelector, UiSelect } from '../../../shared/ui';
import type { UiSelectOption } from '../../../shared/ui';
import { MaintenanceBlock, MaintenanceService } from '../../admin/maintenance/maintenance.service';
import { FltReservationsService } from '../../admin/reservations/flt/flt-reservations.service';
import { FltReservationRecord } from '../../admin/reservations/flt/flt-reservations.models';
import { GymReservationsService } from '../../admin/reservations/gymnasium/gymnasium-reservations.service';
import { GymReservationRecord } from '../../admin/reservations/gymnasium/gymnasium-reservations.models';
import { NexusReservationsService } from '../../admin/reservations/nexus/nexus-reservations.service';
import { NexusReservationRecord } from '../../admin/reservations/nexus/nexus-reservations.models';
import { VanReservationsService } from '../../admin/reservations/van/van-reservations.service';
import { VanReservationRow } from '../../admin/reservations/van/van-reservations.models';
import { EoReservationsService } from '../../eo/eo-reservations.service';
import { EoReservationRecord } from '../../eo/eo-reservations.models';
import { ReservationRealtimeService } from '../../admin/reservations/reservation-realtime.service';
import { ReservationAlertService } from '../../admin/reservations/reservation-alert.service';
import { DashboardEventSummaryModal } from '../../admin/dashboard/dashboard-event-summary-modal';
import { DashboardAnalyticsSection } from '../../admin/dashboard/dashboard-analytics-section';
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
} from '../../admin/dashboard/dashboard-events.util';
import { observePanelHeight } from '../../admin/dashboard/dashboard-calendar-layout.util';
import { downloadVanReservationFormFromEvent } from '../../admin/reservations/van/van-reservation-form-export.util';
import { downloadGymnasiumReservationFormFromEvent } from '../../admin/reservations/gymnasium/gymnasium-reservation-form-export.util';
import { downloadNexusReservationFormFromEvent } from '../../admin/reservations/nexus/nexus-reservation-form-export.util';

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
  selector: 'app-facilities-dashboard',
  imports: [
    UiIcon,
    UiSegmented,
    UiSelect,
    UiDateSelector,
    SlicePipe,
    RouterLink,
    DashboardEventSummaryModal,
    DashboardAnalyticsSection,
  ],
  templateUrl: './facilities-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesDashboard implements OnInit, AfterViewInit, OnDestroy {
  private readonly fltSvc = inject(FltReservationsService);
  private readonly gymSvc = inject(GymReservationsService);
  private readonly nexusSvc = inject(NexusReservationsService);
  private readonly vanSvc = inject(VanReservationsService);
  private readonly eoSvc = inject(EoReservationsService);
  private readonly maintSvc = inject(MaintenanceService);
  private readonly realtime = inject(ReservationRealtimeService);
  private readonly alerts = inject(ReservationAlertService);
  private readonly auth = inject(AuthService);
  private wsSub?: Subscription;
  private pollSub?: Subscription;

  protected readonly allowedServices = computed<DashboardService[]>(() => {
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
  protected readonly activeFacility = signal<DashboardService>('FLT');

  protected readonly facilityFilterOptions = computed(() =>
    dashboardServiceFilterOptions(this.allowedServices()),
  );
  protected readonly facilitySelectOptions = computed<UiSelectOption[]>(() =>
    this.facilityFilterOptions().map((o) => ({
      value: o.value,
      label: o.label,
      disabled: o.disabled,
    })),
  );
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly isComingSoon = computed(
    () => !isServiceImplemented(this.activeFacility()),
  );

  protected readonly eventLegends = computed(() => {
    const facility = this.activeFacility();
    if (this.isComingSoon()) {
      return [{ label: facility, className: SERVICE_EVENT_COLORS[facility] }];
    }
    if (facility === 'Boardroom' || facility === 'Conference') {
      return [{ label: facility, className: SERVICE_EVENT_COLORS[facility] }];
    }
    if (facility === 'VAN') {
      return [
        { label: 'Pending', className: PENDING_EVENT_COLOR },
        ...getVanVehicleLegends(this.vanReservations()),
      ];
    }
    return [
      { label: String(facility), className: SERVICE_EVENT_COLORS[facility] },
      { label: 'Pending', className: PENDING_EVENT_COLOR },
      { label: 'Coordination', className: COORD_EVENT_COLOR },
      { label: 'Maintenance', className: MAINTENANCE_EVENT_COLOR },
    ];
  });

  protected readonly activeRecords = computed(() => {
    switch (this.activeFacility()) {
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
    switch (this.activeFacility()) {
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
    const facility = this.activeFacility();
    const stats = reservationStats(this.activeRecords());
    const month = this.activeDate();
    const kinds: Array<{ kind: DashboardStatKind; label: string; value: number; icon: string }> = [
      { kind: 'total', label: `${facility} – Total`, value: stats.total, icon: 'monitoring' },
      { kind: 'pending', label: `${facility} – Pending`, value: stats.pending, icon: 'pending_actions' },
      { kind: 'approved', label: `${facility} – Approved`, value: stats.approved, icon: 'check_circle' },
      { kind: 'rejected', label: `${facility} – Rejected/Cancelled`, value: stats.rejected, icon: 'cancel' },
    ];

    return kinds.map(({ kind, label, value, icon }) => {
      const route = dashboardApproverRoute(facility, kind, month, 'facilities');
      return {
        label,
        value,
        icon,
        kind,
        cardBg: dashboardStatCardBg(facility, kind),
        loading: this.loading(),
        routerLink: route?.routerLink ?? null,
        queryParams: route?.queryParams ?? null,
      };
    });
  });

  protected readonly facilityEvents = computed<DashboardEvent[]>(() =>
    buildServiceCalendarEvents(
      this.activeRecords(),
      this.activeMaintenance(),
      this.activeFacility(),
    ),
  );

  protected readonly calendarDays = computed(() =>
    createCalendarDays(this.activeDate(), this.facilityEvents()),
  );

  protected readonly calendarDateRows = computed(
    () => `repeat(${this.calendarDays().length / DAYS_PER_WEEK}, minmax(min-content, 1fr))`,
  );

  protected readonly upcomingEvents = computed(() =>
    this.facilityEvents()
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

  protected selectFacility(value: DashboardService): void {
    if (!value) return;
    if (!this.allowedServices().includes(value)) return;
    this.activeFacility.set(value);
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
      // ignore — user can retry from approver page
    }
  }

  ngOnInit(): void {
    const allowed = this.allowedServices();
    this.activeFacility.set(allowed[0] ?? 'FLT');
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
