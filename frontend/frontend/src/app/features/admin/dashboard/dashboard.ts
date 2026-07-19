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
import { forkJoin } from 'rxjs';

import { UiIcon, UiSegmented, UiDateSelector } from '../../../shared/ui';
import { MaintenanceBlock, MaintenanceService } from '../maintenance/maintenance.service';
import { FltReservationsService } from '../reservations/flt/flt-reservations.service';
import { FltReservationRecord } from '../reservations/flt/flt-reservations.models';
import { GymReservationsService } from '../reservations/gymnasium/gymnasium-reservations.service';
import { GymReservationRecord } from '../reservations/gymnasium/gymnasium-reservations.models';
import { VanReservationsService } from '../reservations/van/van-reservations.service';
import { VanReservationRow } from '../reservations/van/van-reservations.models';
import { DashboardEventSummaryModal } from './dashboard-event-summary-modal';
import { DashboardAnalyticsSection } from './dashboard-analytics-section';
import {
  CalendarDay,
  COORD_EVENT_COLOR,
  DashboardEvent,
  DashboardService,
  DashboardStatKind,
  MAINTENANCE_EVENT_COLOR,
  SERVICE_EVENT_COLORS,
  getVanVehicleLegends,
  buildServiceCalendarEvents,
  createCalendarDays,
  dashboardApproverRoute,
  dashboardStatCardBg,
  formatEventDay,
  formatEventMonth,
  getCurrentYearMonth,
  isServiceImplemented,
  reservationStats,
  vanRecordsToDashboardRecords,
} from './dashboard-events.util';
import { observePanelHeight } from './dashboard-calendar-layout.util';
import { downloadVanReservationFormFromEvent } from '../reservations/van/van-reservation-form-export.util';

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
    UiDateSelector,
    SlicePipe,
    RouterLink,
    DashboardEventSummaryModal,
    DashboardAnalyticsSection,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  private readonly fltSvc = inject(FltReservationsService);
  private readonly gymSvc = inject(GymReservationsService);
  private readonly vanSvc = inject(VanReservationsService);
  private readonly maintSvc = inject(MaintenanceService);

  protected readonly loading = signal(true);
  protected readonly fltReservations = signal<FltReservationRecord[]>([]);
  protected readonly gymReservations = signal<GymReservationRecord[]>([]);
  protected readonly vanReservations = signal<VanReservationRow[]>([]);
  protected readonly fltMaintenance = signal<MaintenanceBlock[]>([]);
  protected readonly gymMaintenance = signal<MaintenanceBlock[]>([]);
  protected readonly activeDate = signal(getCurrentYearMonth());
  protected readonly activeService = signal<DashboardService>('FLT');

  protected readonly serviceOptions: DashboardService[] = [
    'FLT',
    'VAN',
    'Gymnasium',
    'Boardroom',
    'Nexus',
    'Conference',
  ];
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly isComingSoon = computed(
    () => !isServiceImplemented(this.activeService()),
  );

  protected readonly eventLegends = computed(() => {
    const service = this.activeService();
    if (this.isComingSoon()) {
      return [{ label: service, className: SERVICE_EVENT_COLORS[service] }];
    }
    if (service === 'VAN') {
      return getVanVehicleLegends(this.vanReservations());
    }
    return [
      { label: service, className: SERVICE_EVENT_COLORS[service] },
      { label: 'Coordination', className: COORD_EVENT_COLOR },
      { label: 'Maintenance', className: MAINTENANCE_EVENT_COLOR },
    ];
  });

  protected readonly activeRecords = computed(() => {
    switch (this.activeService()) {
      case 'Gymnasium':
        return this.gymReservations();
      case 'FLT':
        return this.fltReservations();
      case 'VAN':
        return vanRecordsToDashboardRecords(this.vanReservations());
      default:
        return [];
    }
  });

  protected readonly activeMaintenance = computed(() => {
    switch (this.activeService()) {
      case 'Gymnasium':
        return this.gymMaintenance();
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
    const kinds: Array<{ kind: DashboardStatKind; label: string; value: number; icon: string }> = [
      { kind: 'total', label: `${service} – Total`, value: stats.total, icon: 'monitoring' },
      { kind: 'pending', label: `${service} – Pending`, value: stats.pending, icon: 'pending_actions' },
      { kind: 'approved', label: `${service} – Approved`, value: stats.approved, icon: 'check_circle' },
      { kind: 'rejected', label: `${service} – Rejected/Cancelled`, value: stats.rejected, icon: 'cancel' },
    ];

    return kinds.map(({ kind, label, value, icon }) => {
      const route = dashboardApproverRoute(service, kind, month, false);
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
      .filter(e => e.date.startsWith(this.activeDate()))
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
  );

  protected readonly formatEventMonth = formatEventMonth;
  protected readonly formatEventDay = formatEventDay;

  protected readonly selectedDayForModal = signal<CalendarDay | null>(null);
  protected readonly selectedEvent = signal<DashboardEvent | null>(null);
  protected readonly calendarPanelHeight = signal<number | null>(null);

  @ViewChild('calendarPanel') private calendarPanel?: ElementRef<HTMLElement>;
  private disconnectCalendarHeightObserver?: () => void;

  ngAfterViewInit(): void {
    this.bindCalendarHeightObserver();
  }

  ngOnDestroy(): void {
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
    this.activeDate.set(value);
  }

  protected selectService(value: DashboardService): void {
    if (!value) return;
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

  protected async printVanForm(event: DashboardEvent): Promise<void> {
    if (event.facility !== 'VAN') return;
    try {
      await downloadVanReservationFormFromEvent(event);
    } catch {
      // no toast on dashboard — modal close is enough
    }
  }

  ngOnInit(): void {
    forkJoin({
      flt: this.fltSvc.getAll(),
      gym: this.gymSvc.getAll(),
      van: this.vanSvc.getAll(),
      fltMaint: this.maintSvc.getBlocks('FLT'),
      gymMaint: this.maintSvc.getBlocks('GYMNASIUM'),
    }).subscribe({
      next: ({ flt, gym, van, fltMaint, gymMaint }) => {
        this.fltReservations.set(flt.reservations ?? []);
        this.gymReservations.set(gym.reservations ?? []);
        this.vanReservations.set(van.reservations ?? []);
        this.fltMaintenance.set(fltMaint.blocks ?? []);
        this.gymMaintenance.set(gymMaint.blocks ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
