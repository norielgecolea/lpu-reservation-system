import { SlicePipe } from '@angular/common';
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
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { allottedEoRooms } from '../../core/auth/roles';
import { UiDateSelector, UiIcon, UiSegmented } from '../../shared/ui';
import type { UiSegmentedOption } from '../../shared/ui';
import { formatReadableTime, formatTimeRange } from '../../shared/utils/datetime.util';
import {
  BOARDROOM_EVENT_COLOR,
  CONFERENCE_EVENT_COLOR,
  CalendarDay,
  DashboardEvent,
  createCalendarDays,
  dashboardEventDateBadgeClass,
  dashboardEventDisplayTitle,
  formatEventDay,
  formatEventMonth,
  getCurrentYearMonth,
  parseReservedDates,
} from '../admin/dashboard/dashboard-events.util';
import { observePanelHeight } from '../admin/dashboard/dashboard-calendar-layout.util';
import { ReservationRealtimeService } from '../admin/reservations/reservation-realtime.service';
import { EoStepper } from './eo-stepper';
import {
  EO_TIME_SLOTS,
  EoReservationRecord,
  EoReservedDateSlot,
  EoRoomType,
  eoRoomLabel,
} from './eo-reservations.models';
import { EoReservationsService } from './eo-reservations.service';

type View = 'calendar' | 'timeslots' | 'form';

@Component({
  selector: 'app-eo-dashboard',
  imports: [SlicePipe, UiDateSelector, UiIcon, UiSegmented, EoStepper],
  templateUrl: './eo-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class EoDashboard implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(EoReservationsService);
  private readonly realtime = inject(ReservationRealtimeService);
  private wsSub?: Subscription;
  private pollSub?: Subscription;

  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly timeSlots = EO_TIME_SLOTS;
  protected readonly eoRoomLabel = eoRoomLabel;
  protected readonly formatEventMonth = formatEventMonth;
  protected readonly formatEventDay = formatEventDay;
  protected readonly dashboardEventDateBadgeClass = dashboardEventDateBadgeClass;
  protected readonly dashboardEventDisplayTitle = dashboardEventDisplayTitle;

  protected readonly allowedRooms = computed<EoRoomType[]>(() => {
    const rooms = allottedEoRooms(this.auth.user());
    return rooms.filter((r): r is EoRoomType => r === 'BOARDROOM' || r === 'CONFERENCE');
  });

  protected readonly roomTabs = computed<UiSegmentedOption[]>(() =>
    this.allowedRooms().map((room) => ({
      value: room,
      label: eoRoomLabel(room),
    })),
  );

  protected readonly view = signal<View>('calendar');
  protected readonly activeDate = signal(getCurrentYearMonth());
  protected readonly activeRoom = signal<EoRoomType>('BOARDROOM');
  protected readonly loading = signal(true);
  protected readonly reservations = signal<EoReservationRecord[]>([]);
  protected readonly selectedDay = signal<string | null>(null);
  protected readonly selectedTimeStart = signal<number | null>(null);
  protected readonly selectedTimeEnd = signal<number | null>(null);
  protected readonly timeSlotError = signal('');
  protected readonly basket = signal<EoReservedDateSlot[]>([]);
  protected readonly selectedEvent = signal<DashboardEvent | null>(null);
  protected readonly selectedDayForModal = signal<CalendarDay | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal('');
  protected readonly saveNotice = signal('');
  protected readonly calendarPanelHeight = signal<number | null>(null);

  @ViewChild('calendarPanel') private calendarPanel?: ElementRef<HTMLElement>;
  private disconnectCalendarHeightObserver?: () => void;

  protected readonly roomEvents = computed<DashboardEvent[]>(() => {
    const room = this.activeRoom();
    const color = room === 'CONFERENCE' ? CONFERENCE_EVENT_COLOR : BOARDROOM_EVENT_COLOR;
    const facility = room === 'CONFERENCE' ? 'Conference' : 'Boardroom';
    const events: DashboardEvent[] = [];
    for (const rec of this.reservations()) {
      if (rec.roomType !== room || rec.status !== 'APPROVED') continue;
      const slots = parseReservedDates(rec.reservedDates);
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        events.push({
          id: `eo-${rec.id}-slot-${i}`,
          title: rec.agenda || rec.organization,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          time: formatTimeRange(s.startTime, s.endTime),
          colorClass: color,
          eventKind: 'reservation',
          category: facility,
          facility,
          reservationId: rec.id,
          eventTitle: rec.agenda,
          department: rec.department,
          organization: rec.organization,
          contactPerson: rec.contactPerson || '—',
          contactEmail: rec.contactEmail || '',
          contactNumber: rec.contactNumber || undefined,
          status: rec.status,
          additionalInstructions: rec.notes,
          reservedSlots: slots.map((slot) => ({
            ...slot,
            time: formatTimeRange(slot.startTime, slot.endTime),
          })),
          requestedEquipment: [],
        });
      }
    }
    return events;
  });

  protected readonly calendarDays = computed(() =>
    createCalendarDays(this.activeDate(), this.roomEvents()),
  );

  protected readonly calendarDateRows = computed(
    () => `repeat(${Math.max(this.calendarDays().length / 7, 1)}, minmax(min-content, 1fr))`,
  );

  protected readonly upcomingEvents = computed(() =>
    this.roomEvents()
      .filter((e) => e.date.startsWith(this.activeDate()))
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
  );

  ngOnInit(): void {
    const rooms = this.allowedRooms();
    if (rooms.length && !rooms.includes(this.activeRoom())) {
      this.activeRoom.set(rooms[0]);
    }
    this.loadEvents();
    this.realtime.ensureConnected();
    this.wsSub = this.realtime.eoUpdates$.subscribe(() => this.loadEvents({ quiet: true }));
    this.pollSub = this.realtime.refreshTicks$.subscribe(() => this.loadEvents({ quiet: true }));
  }

  ngAfterViewInit(): void {
    this.bindCalendarHeightObserver();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.disconnectCalendarHeightObserver?.();
  }

  protected selectDate(value: string): void {
    const previous = this.activeDate();
    this.activeDate.set(value);
    if (previous !== value) this.loadEvents();
  }

  protected selectRoom(value: string): void {
    if (value !== 'BOARDROOM' && value !== 'CONFERENCE') return;
    if (!this.allowedRooms().includes(value)) return;
    if (this.activeRoom() === value) return;
    this.activeRoom.set(value);
    this.basket.set([]);
    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
  }

  protected dateStrForDay(day: number): string {
    return `${this.activeDate()}-${String(day).padStart(2, '0')}`;
  }

  protected isPastDay(day: number): boolean {
    return this.dateStrForDay(day) < todayDateStr();
  }

  protected isBasketDay(day: number): boolean {
    const dateStr = this.dateStrForDay(day);
    return this.basket().some((s) => s.date === dateStr);
  }

  protected selectDay(day: CalendarDay, event?: Event): void {
    if (day.day === null || this.isPastDay(day.day)) return;
    if ((event?.target as HTMLElement | null)?.closest('li, button')) return;
    this.selectedDay.set(this.dateStrForDay(day.day));
    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
    this.timeSlotError.set('');
    this.view.set('timeslots');
  }

  protected openEventSummary(event: DashboardEvent, click?: Event): void {
    click?.stopPropagation();
    this.selectedEvent.set(event);
    this.cancelError.set('');
    this.closeDayModal();
  }

  protected closeEventSummary(): void {
    this.selectedEvent.set(null);
    this.cancelling.set(false);
    this.cancelError.set('');
  }

  protected openDayModal(day: CalendarDay, click?: Event): void {
    click?.stopPropagation();
    this.selectedDayForModal.set(day);
  }

  protected closeDayModal(): void {
    this.selectedDayForModal.set(null);
  }

  protected getSlotEvent(hourStr: string): DashboardEvent | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return (
      this.roomEvents().find((ev) => {
        if (ev.date !== day) return false;
        const start = parseInt(ev.startTime, 10);
        const end = parseInt(ev.endTime, 10);
        return hour >= start && hour <= end;
      }) ?? null
    );
  }

  protected isSlotSelected(hourStr: string): boolean {
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (start === null) return false;
    if (end === null) return hour === start;
    return hour >= start && hour <= end;
  }

  protected isSlotInBasket(hourStr: string): boolean {
    const day = this.selectedDay();
    if (!day) return false;
    return this.basket().some((s) => {
      if (s.date !== day) return false;
      const hour = parseInt(hourStr, 10);
      const start = parseInt(s.startTime, 10);
      const end = parseInt(s.endTime, 10);
      return hour >= start && hour <= end;
    });
  }

  protected toggleTimeSlot(hourStr: string): void {
    this.timeSlotError.set('');
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    if (start === null) {
      this.selectedTimeStart.set(hour);
      this.selectedTimeEnd.set(null);
      return;
    }
    const lo = Math.min(start, hour);
    const hi = start === hour ? hour + 1 : Math.max(start, hour);
    const day = this.selectedDay()!;
    const hasConflict = this.roomEvents().some((ev) => {
      if (ev.date !== day) return false;
      const evStart = parseInt(ev.startTime, 10);
      const evEnd = parseInt(ev.endTime, 10);
      return evStart < hi && evEnd > lo;
    });
    if (hasConflict) {
      this.timeSlotError.set('Your selection crosses a reserved slot. Please choose a different range.');
      this.selectedTimeStart.set(hour);
      this.selectedTimeEnd.set(null);
      return;
    }
    this.selectedTimeStart.set(lo);
    this.selectedTimeEnd.set(hi);
  }

  protected addToBasket(): void {
    const day = this.selectedDay();
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (!day || start === null || end === null) return;
    const startStr = `${String(start).padStart(2, '0')}:00`;
    const endStr = `${String(end).padStart(2, '0')}:00`;
    this.basket.update((b) => {
      const without = b.filter((s) => s.date !== day);
      return [...without, { date: day, startTime: startStr, endTime: endStr }].sort((a, c) =>
        a.date.localeCompare(c.date),
      );
    });
    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
    this.timeSlotError.set('');
    this.view.set('calendar');
  }

  protected removeFromBasket(date: string): void {
    this.basket.update((b) => b.filter((s) => s.date !== date));
  }

  protected goToForm(): void {
    if (this.basket().length === 0) return;
    this.view.set('form');
  }

  protected backToCalendar(): void {
    this.view.set('calendar');
  }

  protected onSaved(): void {
    this.basket.set([]);
    this.view.set('calendar');
    this.saveNotice.set('Reservation saved.');
    this.loadEvents();
    setTimeout(() => this.saveNotice.set(''), 4000);
  }

  protected cancelReservation(): void {
    const event = this.selectedEvent();
    if (!event) return;
    this.cancelling.set(true);
    this.cancelError.set('');
    this.api.cancel(event.reservationId).subscribe({
      next: (res) => {
        this.cancelling.set(false);
        if (res.success) {
          this.closeEventSummary();
          this.loadEvents();
        } else {
          this.cancelError.set(res.message || 'Failed to cancel');
        }
      },
      error: (err) => {
        this.cancelling.set(false);
        this.cancelError.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected formatDateLong(dateStr: string | null): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected formatDateShort(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  protected formatTimeShort(timeStr: string): string {
    return formatReadableTime(timeStr);
  }

  private loadEvents(opts?: { quiet?: boolean }): void {
    if (!opts?.quiet) this.loading.set(true);
    this.api.listEvents(this.activeDate(), this.activeRoom()).subscribe({
      next: (res) => {
        this.reservations.set(res.reservations ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private bindCalendarHeightObserver(): void {
    this.disconnectCalendarHeightObserver?.();
    this.disconnectCalendarHeightObserver = observePanelHeight(
      this.calendarPanel?.nativeElement,
      (height) => this.calendarPanelHeight.set(height),
    );
  }
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
