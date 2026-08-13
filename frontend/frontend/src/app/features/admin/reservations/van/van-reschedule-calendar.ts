import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { UiIcon } from '../../../../shared/ui';
import { formatReadableTime } from '../../../../shared/utils/datetime.util';
import { ReservedDateSlot } from './van-reservations.models';

export interface VanRescheduleEvent {
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  organization: string;
  travelDestination: string;
  eventKind: 'RESERVATION' | 'PENDING';
  vehicleId?: number | null;
  vehicleLabel?: string | null;
}

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  isToday: boolean;
  isPast: boolean;
  events: VanRescheduleEvent[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7;
  const label = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label };
});

type PickerView = 'calendar' | 'timeslots';

@Component({
  selector: 'app-van-reschedule-calendar',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex min-h-0 flex-col bg-gray-50">
      <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg shrink-0">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3 flex-1">
            <button type="button" (click)="cancelled.emit()"
              class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer text-sm">
              <ui-icon name="arrow_back" class="text-xl" />
            </button>
            <div>
              <h1 class="text-lg sm:text-xl font-black tracking-tight leading-tight">Reschedule Van Trip</h1>
              <p class="text-white/60 text-xs">{{ tripTitle }} — pick new date(s) and time slots</p>
              @if (vehicleSummary) {
                <p class="text-white/75 text-[11px] mt-0.5">Showing schedule for: {{ vehicleSummary }}</p>
              }
            </div>
          </div>
          <div class="flex items-center gap-3">
            @if (pickerView() === 'calendar') {
              <div class="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                <button type="button" (click)="prevMonth()"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
                  <ui-icon name="chevron_left" class="text-xl" />
                </button>
                <span class="px-3 text-sm font-bold min-w-32 text-center">{{ monthLabel() }}</span>
                <button type="button" (click)="nextMonth()"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
                  <ui-icon name="chevron_right" class="text-xl" />
                </button>
              </div>
            } @else {
              <button type="button" (click)="pickerView.set('calendar')"
                class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer text-sm">
                <ui-icon name="calendar_month" class="text-base" />
                Calendar
              </button>
            }
          </div>
        </div>
      </div>

      @if (pickerView() === 'calendar') {
        <div class="flex min-h-0 flex-1 flex-col max-w-screen-2xl w-full mx-auto px-4 sm:px-6 py-4 gap-3">
          <div class="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl ring-1 ring-black/5 shadow-sm bg-white">
            <div class="grid grid-cols-7 bg-primary text-center text-sm font-bold text-white shrink-0">
              @for (wd of weekdays; track wd) {
                <div class="border-r border-white/30 px-1 py-2.5 last:border-r-0 text-xs sm:text-sm">{{ wd }}</div>
              }
            </div>
            <div class="min-h-0 flex-1 grid grid-cols-7 overflow-hidden" [style.grid-template-rows]="calendarRows()">
              @for (cell of calendarCells(); track $index) {
                <div
                  class="flex h-full min-h-0 flex-col overflow-hidden border-r border-b border-gray-100 bg-white p-1 sm:p-1.5 transition-colors"
                  [class.bg-gray-50]="cell.day !== null && !cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                  [class.bg-gray-100]="cell.day === null"
                  [class.bg-primary/5]="cell.isToday"
                  [class.bg-emerald-50]="cell.day !== null && !cell.isToday && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                  [class.ring-2]="cell.day !== null && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                  [class.ring-inset]="cell.day !== null && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                  [class.ring-emerald-500]="cell.day !== null && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                  [class.cursor-pointer]="cell.day !== null && !cell.isPast"
                  [class.hover:bg-sky-50]="cell.day !== null && !cell.isPast && !cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                  [class.opacity-40]="cell.isPast"
                  (click)="cell.day !== null && !cell.isPast ? selectDay(cell.dateStr!) : null"
                >
                  @if (cell.day !== null) {
                    <span
                      class="mx-auto mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs font-semibold"
                      [class.bg-primary]="cell.isToday"
                      [class.text-white]="cell.isToday || basket().some(s => s.date === cell.dateStr)"
                      [class.bg-emerald-500]="!cell.isToday && basket().some(s => s.date === cell.dateStr)"
                      [class.text-gray-700]="!cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                    >{{ cell.day }}</span>
                    @if (cell.events.length > 0) {
                      <ul class="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-hidden">
                        @for (ev of cell.events.slice(0, 2); track (ev.vehicleId ?? 0) + ev.department + ev.startTime + ev.endTime + ev.eventKind) {
                          <li
                            class="min-w-0 truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight font-semibold"
                            [class]="ev.eventKind === 'PENDING' ? 'border-orange-500 bg-orange-50 text-orange-900' : vehicleChipClass(ev.vehicleId)"
                            [title]="ev.eventKind === 'PENDING' ? ('Pending · ' + eventTitle(ev)) : eventTitle(ev)"
                          >{{ formatTimeShort(ev.startTime) }} · {{ ev.eventKind === 'PENDING' ? ('Pending · ' + (ev.travelDestination || ev.department)) : (ev.vehicleLabel || ev.travelDestination || ev.department) }}</li>
                        }
                        @if (cell.events.length > 2) {
                          <li class="truncate text-[10px] font-bold text-primary pl-1">+{{ cell.events.length - 2 }} more</li>
                        }
                      </ul>
                    }
                    @if (basket().some(s => s.date === cell.dateStr)) {
                      <div class="mt-auto pt-0.5">
                        <span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 leading-none">
                          ✓ Selected
                        </span>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 shrink-0 text-xs text-gray-500">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-sky-500 bg-sky-50"></span>
              Assigned vehicle trip
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-orange-500 bg-orange-50"></span>
              Pending Request
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
              Your Selection
            </span>
            @if (scheduleLoading()) {
              <span class="flex items-center gap-1.5 text-primary">
                <ui-icon name="autorenew" class="text-sm animate-spin" />
                Loading vehicle schedule...
              </span>
            }
            <span class="ml-auto text-[11px] italic">Click a date to select a time slot</span>
          </div>
        </div>

        @if (basket().length > 0) {
          <div class="shrink-0 border-t border-gray-200 bg-white shadow-lg px-4 sm:px-6 py-3">
            <div class="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-1 flex flex-wrap gap-2">
                @for (slot of basket(); track slot.date) {
                  <div class="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary">
                    <ui-icon name="event" class="text-sm" />
                    {{ formatDateShort(slot.date) }} Dep {{ formatTimeShort(slot.startTime) }} – Ret {{ formatTimeShort(slot.endTime) }}
                    <button type="button" (click)="removeFromBasket(slot.date)"
                      class="ml-1 hover:text-red-500 cursor-pointer transition-colors">
                      <ui-icon name="close" class="text-sm" />
                    </button>
                  </div>
                }
              </div>
              <button type="button" (click)="save()" [disabled]="saving()"
                class="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0">
                @if (saving()) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                @else { <ui-icon name="save" class="text-base" /> }
                Save Reschedule ({{ basket().length }} date{{ basket().length > 1 ? 's' : '' }})
              </button>
            </div>
          </div>
        }
      }

      @if (pickerView() === 'timeslots') {
        <div class="flex min-h-0 flex-1 flex-col max-w-screen-md mx-auto w-full px-3 sm:px-6 pt-3 sm:pt-4">
          <div class="flex shrink-0 flex-col gap-2 px-1">
            <div class="flex items-center gap-2">
              <ui-icon name="calendar_today" class="text-primary text-base" />
              <span class="text-sm font-bold text-gray-800">{{ formatDateLong(selectedDay()) }}</span>
              <span class="ml-auto hidden text-xs text-gray-400 sm:inline">Scroll for later hours</span>
            </div>

            <div class="rounded-xl bg-primary/5 border border-primary/20 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <ui-icon name="flight_takeoff" class="text-primary shrink-0" />
                <div class="min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wide text-sky-500">Departure</span>
                  <span class="block font-semibold text-gray-800 truncate">{{ selectedDepartureLabel() }}</span>
                </div>
              </div>
              <ui-icon name="arrow_forward" class="text-gray-300 hidden sm:block shrink-0" />
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <ui-icon name="flight_land" class="text-primary shrink-0" />
                <div class="min-w-0">
                  <span class="text-[10px] font-bold uppercase tracking-wide text-sky-500">Return</span>
                  <span class="block font-semibold text-gray-800 truncate">{{ selectedReturnLabel() }}</span>
                </div>
              </div>
            </div>
            <p class="text-xs text-gray-400 text-center">
              @if (selectedTimeStart() === null) {
                Click an available slot to set your <strong>Departure</strong> time.
              } @else if (selectedTimeEnd() === null) {
                Click an available slot to set your <strong>Return</strong> time (must be after departure).
              } @else {
                Departure and Return times selected. Click "Add Date" to confirm.
              }
            </p>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3" style="scrollbar-width: thin">
            <div class="rounded-xl ring-1 ring-black/5 shadow-sm bg-white">
              @for (slot of timeSlots; track slot.value) {
                @if (getSlotEvents(slot.value); as occupied) {
                  @if (occupied.length > 0) {
                  <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                    <div class="w-16 sm:w-24 shrink-0 flex items-center justify-end pr-2 sm:pr-3 py-2 sm:py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                      {{ slot.label }}
                    </div>
                    <div class="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col gap-1.5 bg-sky-50">
                      @for (ev of occupied; track (ev.vehicleId ?? 0) + ev.startTime + ev.travelDestination) {
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="flex-1 min-w-0">
                            @if (ev.vehicleLabel) {
                              <p class="text-[10px] font-bold uppercase tracking-wide text-sky-500 truncate">{{ ev.vehicleLabel }}</p>
                            }
                            <p class="text-xs font-bold truncate text-sky-700">{{ ev.travelDestination || ev.department }}</p>
                            <p class="text-[10px] text-sky-500">{{ formatTimeShort(ev.startTime) }} – {{ formatTimeShort(ev.endTime) }} · Reserved</p>
                          </div>
                          <ui-icon name="lock" class="text-sm shrink-0 text-sky-400" />
                        </div>
                      }
                    </div>
                  </div>
                  } @else if (isSlotInBasket(slot.value)) {
                  <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                    <div class="w-16 sm:w-24 shrink-0 flex items-center justify-end pr-2 sm:pr-3 py-2 sm:py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                      {{ slot.label }}
                    </div>
                    <div class="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-primary/5 flex items-center gap-2">
                      <ui-icon name="check_circle" class="text-primary text-base shrink-0" />
                      <span class="text-xs font-semibold text-primary">Your selection</span>
                    </div>
                  </div>
                  } @else {
                  <div class="flex items-stretch border-b border-gray-100 last:border-b-0 cursor-pointer group"
                    [class.ring-2]="isSlotSelected(slot.value)"
                    [class.ring-primary]="isSlotSelected(slot.value)"
                    [class.bg-primary/5]="isSlotSelected(slot.value)"
                    (click)="toggleTimeSlot(slot.value)">
                    <div class="w-16 sm:w-24 shrink-0 flex items-center justify-end pr-2 sm:pr-3 py-2 sm:py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                      {{ slot.label }}
                    </div>
                    <div class="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2 group-hover:bg-emerald-50 transition-colors">
                      @if (isSlotSelected(slot.value)) {
                        <ui-icon name="check" class="text-primary text-base shrink-0" />
                        <span class="text-xs font-semibold text-primary">
                          @if (isDepartureSlot(slot.value)) { Departure } @else { Return }
                        </span>
                      } @else if (getPendingOnSlot(slot.value); as pending) {
                        <ui-icon name="schedule" class="text-orange-400 text-sm shrink-0" />
                        <span class="text-xs text-orange-700 font-medium truncate">
                          Pending request {{ formatTimeShort(pending.startTime) }}–{{ formatTimeShort(pending.endTime) }} — click to overlap
                        </span>
                      } @else {
                        <span class="text-xs text-gray-400 group-hover:text-emerald-600 transition-colors">Available</span>
                      }
                    </div>
                  </div>
                  }
                }
              }
            </div>

            @if (timeSlotError()) {
              <p class="mt-3 text-sm text-red-500 flex items-center gap-1.5">
                <ui-icon name="warning" class="text-base" />{{ timeSlotError() }}
              </p>
            }

            @if (basket().length > 0) {
              <div class="mt-4">
                <p class="text-xs font-semibold text-gray-500 mb-2">Selected dates:</p>
                <div class="flex flex-wrap gap-2">
                  @for (s of basket(); track s.date) {
                    <div class="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary">
                      {{ formatDateShort(s.date) }} Dep {{ formatTimeShort(s.startTime) }} – Ret {{ formatTimeShort(s.endTime) }}
                      <button type="button" (click)="removeFromBasket(s.date)"
                        class="ml-1 hover:text-red-500 cursor-pointer transition-colors">
                        <ui-icon name="close" class="text-sm" />
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="shrink-0 flex flex-col gap-2 border-t border-gray-200 bg-gray-50 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div class="flex gap-2 sm:gap-3">
              <button type="button" (click)="pickerView.set('calendar')"
                class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-semibold text-gray-700 hover:bg-white transition-colors cursor-pointer">
                <ui-icon name="arrow_back" class="text-base" /> Back
              </button>
              <button type="button" (click)="addToBasket()" [disabled]="selectedTimeStart() === null || selectedTimeEnd() === null"
                class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                <ui-icon name="add" class="text-base" /> Add Date
              </button>
            </div>
            @if (basket().length > 0) {
              <button type="button" (click)="save()" [disabled]="saving()"
                class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 sm:py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                @if (saving()) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                @else { <ui-icon name="save" class="text-base" /> }
                Save Reschedule ({{ basket().length }})
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class VanRescheduleCalendar implements OnChanges {
  private readonly _events = signal<VanRescheduleEvent[]>([]);
  @Input() set events(val: VanRescheduleEvent[]) { this._events.set(val ?? []); }
  get events(): VanRescheduleEvent[] { return this._events(); }

  @Input() initialSlots: ReservedDateSlot[] = [];
  @Input() tripTitle = '';
  @Input() vehicleSummary = '';
  @Input() scheduleLoading = signal(false);
  @Input() saving = signal(false);
  @Output() saved = new EventEmitter<ReservedDateSlot[]>();
  @Output() cancelled = new EventEmitter<void>();

  readonly pickerView = signal<PickerView>('calendar');
  readonly basket = signal<ReservedDateSlot[]>([]);
  readonly activeYear = signal(new Date().getFullYear());
  readonly activeMonth = signal(new Date().getMonth());
  readonly selectedDay = signal<string | null>(null);
  readonly selectedTimeStart = signal<number | null>(null);
  readonly selectedTimeEnd = signal<number | null>(null);
  readonly timeSlotError = signal('');

  readonly weekdays = WEEKDAYS;
  readonly timeSlots = TIME_SLOTS;

  private static readonly VEHICLE_CHIP_CLASSES = [
    'border-sky-500 bg-sky-50 text-sky-800',
    'border-violet-500 bg-violet-50 text-violet-800',
    'border-amber-500 bg-amber-50 text-amber-800',
    'border-teal-500 bg-teal-50 text-teal-800',
    'border-rose-500 bg-rose-50 text-rose-800',
  ];

  ngOnChanges(changes: SimpleChanges): void {
    // Seed once on open only. Parent polls refresh reservations while the overlay
    // is open, which recreates initialSlots and would otherwise wipe in-progress edits.
    const ch = changes['initialSlots'];
    if (ch?.firstChange) {
      const slots = (ch.currentValue as ReservedDateSlot[] | null) ?? [];
      this.basket.set(slots.map(s => ({ ...s })));
    }
  }

  readonly monthLabel = computed(() => {
    const d = new Date(this.activeYear(), this.activeMonth(), 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  readonly calendarCells = computed<CalendarCell[]>(() => {
    const year = this.activeYear();
    const month = this.activeMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.fmt(today);
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.max(5, Math.ceil((firstWeekday + daysInMonth) / 7)) * 7;
    const evs = this._events();

    return Array.from({ length: cellCount }, (_, i) => {
      const dayOffset = i - firstWeekday;
      if (dayOffset < 0 || dayOffset >= daysInMonth) {
        return { day: null, dateStr: null, isToday: false, isPast: false, events: [] };
      }
      const day = dayOffset + 1;
      const dateStr = this.fmt(new Date(year, month, day));
      return { day, dateStr, isToday: dateStr === todayStr, isPast: dateStr < todayStr, events: evs.filter(e => e.date === dateStr) };
    });
  });

  readonly calendarRows = computed(() => `repeat(${this.calendarCells().length / 7}, minmax(4.75rem, 1fr))`);

  prevMonth(): void {
    if (this.activeMonth() === 0) { this.activeMonth.set(11); this.activeYear.update(y => y - 1); }
    else { this.activeMonth.update(m => m - 1); }
  }

  nextMonth(): void {
    if (this.activeMonth() === 11) { this.activeMonth.set(0); this.activeYear.update(y => y + 1); }
    else { this.activeMonth.update(m => m + 1); }
  }

  selectDay(dateStr: string): void {
    this.selectedDay.set(dateStr);
    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
    this.timeSlotError.set('');
    this.pickerView.set('timeslots');
  }

  /** Locked rows — only approved vehicle trips block selection. */
  getSlotEvents(hourStr: string): VanRescheduleEvent[] {
    const day = this.selectedDay();
    if (!day) return [];
    const hour = parseInt(hourStr, 10);
    return this._events().filter(ev => {
      if (ev.date !== day || ev.eventKind !== 'RESERVATION') return false;
      // Inclusive of end clock time so 08:00–12:00 highlights through 12:00
      return hour >= parseInt(ev.startTime, 10) && hour <= parseInt(ev.endTime, 10);
    });
  }

  /** Pending request on this hour — informational only; selection/overlap is allowed. */
  getPendingOnSlot(hourStr: string): VanRescheduleEvent | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this._events().find(ev => {
      if (ev.date !== day || ev.eventKind !== 'PENDING') return false;
      return hour >= parseInt(ev.startTime, 10) && hour <= parseInt(ev.endTime, 10);
    }) ?? null;
  }

  eventTitle(ev: VanRescheduleEvent): string {
    const time = `${this.formatTimeShort(ev.startTime)}–${this.formatTimeShort(ev.endTime)}`;
    const trip = ev.travelDestination || ev.department;
    return ev.vehicleLabel ? `${ev.vehicleLabel} · ${time} · ${trip}` : `${time} · ${trip}`;
  }

  vehicleChipClass(vehicleId: number | null | undefined): string {
    const palette = VanRescheduleCalendar.VEHICLE_CHIP_CLASSES;
    if (vehicleId == null) return palette[0];
    const ids = [...new Set(this._events().map(e => e.vehicleId).filter((id): id is number => id != null))];
    const idx = Math.max(0, ids.indexOf(vehicleId));
    return palette[idx % palette.length];
  }

  isSlotSelected(hourStr: string): boolean {
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (start === null) return false;
    if (end === null) return hour === start;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    return hour >= lo && hour <= hi;
  }

  isDepartureSlot(hourStr: string): boolean {
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (start === null) return false;
    if (end === null) return hour === start;
    return hour === Math.min(start, end);
  }

  selectedDepartureLabel(): string {
    const start = this.selectedTimeStart();
    if (start === null) return 'Not selected';
    return this.formatTimeShort(`${String(start).padStart(2, '0')}:00`);
  }

  selectedReturnLabel(): string {
    const end = this.selectedTimeEnd();
    if (end === null) return 'Not selected';
    return this.formatTimeShort(`${String(end).padStart(2, '0')}:00`);
  }

  formatTimeShort(timeStr: string): string {
    return formatReadableTime(timeStr);
  }

  isSlotInBasket(hourStr: string): boolean {
    const day = this.selectedDay();
    if (!day) return false;
    return this.basket().some(s => {
      if (s.date !== day) return false;
      const hour = parseInt(hourStr, 10);
      return hour >= parseInt(s.startTime, 10) && hour <= parseInt(s.endTime, 10);
    });
  }

  toggleTimeSlot(hourStr: string): void {
    this.timeSlotError.set('');
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();

    if (start === null) {
      this.selectedTimeStart.set(hour);
      this.selectedTimeEnd.set(null);
      return;
    }

    if (end === null) {
      if (hour <= start) {
        this.timeSlotError.set('Return time must be after Departure time.');
        return;
      }

      const conflict = this._events().find(ev => {
        if (ev.date !== this.selectedDay() || ev.eventKind !== 'RESERVATION') return false;
        return start < parseInt(ev.endTime, 10) && hour > parseInt(ev.startTime, 10);
      });
      if (conflict) {
        this.timeSlotError.set('Selection overlaps with an existing approved trip.');
        return;
      }

      this.selectedTimeStart.set(start);
      this.selectedTimeEnd.set(hour);
      return;
    }

    this.selectedTimeStart.set(hour);
    this.selectedTimeEnd.set(null);
  }

  addToBasket(): void {
    const day = this.selectedDay();
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (!day || start === null || end === null) return;
    const startStr = `${String(start).padStart(2, '0')}:00`;
    const endStr = `${String(end).padStart(2, '0')}:00`;
    this.basket.update(b => b.filter(s => s.date !== day));
    this.basket.update(b => [...b, { date: day, startTime: startStr, endTime: endStr }]);
    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
    this.pickerView.set('calendar');
  }

  removeFromBasket(date: string): void {
    this.basket.update(b => b.filter(s => s.date !== date));
  }

  save(): void {
    this.saved.emit(this.basket());
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDateLong(dateStr: string | null): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  private fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
