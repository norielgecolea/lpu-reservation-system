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
import { ReservedDateSlot } from './nexus-reservations.models';

export interface NexusRescheduleEvent {
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  organization: string;
  eventTitle?: string;
  eventKind: 'RESERVATION' | 'COORDINATION' | 'TARGET';
}

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  isToday: boolean;
  isPast: boolean;
  events: NexusRescheduleEvent[];
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
  selector: 'app-nexus-reschedule-calendar',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex min-h-0 flex-col bg-gray-50">
      <!-- Header -->
      <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg shrink-0">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3 flex-1">
            <button type="button" (click)="cancelled.emit()"
              class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer text-sm">
              <ui-icon name="arrow_back" class="text-xl" />
            </button>
            <div>
              <h1 class="text-lg sm:text-xl font-black tracking-tight leading-tight">Reschedule Reservation</h1>
              <p class="text-white/60 text-xs">{{ eventTitle }} — pick new date(s) and time slots</p>
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

      <!-- Calendar view -->
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
                      [class.text-white]="cell.isToday"
                      [class.bg-emerald-500]="!cell.isToday && basket().some(s => s.date === cell.dateStr)"
                      [class.text-white]="!cell.isToday && basket().some(s => s.date === cell.dateStr)"
                      [class.text-gray-700]="!cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                    >{{ cell.day }}</span>
                    @if (cell.events.length > 0) {
                      <ul class="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-hidden">
                        @for (ev of cell.events.slice(0, 2); track ev.department + ev.startTime + ev.endTime) {
                          <li
                            class="min-w-0 truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight font-semibold"
                            [class.border-sky-500]="ev.eventKind !== 'COORDINATION'"
                            [class.bg-sky-50]="ev.eventKind !== 'COORDINATION'"
                            [class.text-sky-800]="ev.eventKind !== 'COORDINATION'"
                            [class.border-amber-500]="ev.eventKind === 'COORDINATION'"
                            [class.bg-amber-50]="ev.eventKind === 'COORDINATION'"
                            [class.text-amber-800]="ev.eventKind === 'COORDINATION'"
                            [title]="formatTimeShort(ev.startTime) + '–' + formatTimeShort(ev.endTime) + ' · ' + (ev.eventKind === 'COORDINATION' ? 'Coordination' : ev.department)"
                          >{{ formatTimeShort(ev.startTime) }} · {{ ev.eventKind === 'COORDINATION' ? 'Coordination' : ev.department }}</li>
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
              Approved Reservation
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-amber-500 bg-amber-50"></span>
              Coordination Meeting
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
              Your Selection
            </span>
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
                    {{ formatDateShort(slot.date) }} {{ formatTimeShort(slot.startTime) }}–{{ formatTimeShort(slot.endTime) }}
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

      <!-- Time-slot view -->
      @if (pickerView() === 'timeslots') {
        <div class="flex min-h-0 flex-1 flex-col max-w-screen-md mx-auto w-full px-3 sm:px-6 pt-3 sm:pt-4">
          <div class="flex shrink-0 items-center gap-2 px-1">
            <ui-icon name="calendar_today" class="text-primary text-base" />
            <span class="text-sm font-bold text-gray-800">{{ formatDateLong(selectedDay()) }}</span>
            <span class="ml-auto hidden text-xs text-gray-400 sm:inline">Select start and end hour</span>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3" style="scrollbar-width: thin">
            <div class="rounded-xl ring-1 ring-black/5 shadow-sm bg-white">
              @for (slot of timeSlots; track slot.value) {
                @if (getSlotEvent(slot.value); as ev) {
                  <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                    <div class="w-16 sm:w-24 shrink-0 flex items-center justify-end pr-2 sm:pr-3 py-2 sm:py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                      {{ slot.label }}
                    </div>
                    <div class="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2"
                      [class.bg-sky-50]="ev.eventKind !== 'COORDINATION'"
                      [class.bg-amber-50]="ev.eventKind === 'COORDINATION'">
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold truncate"
                          [class.text-sky-700]="ev.eventKind !== 'COORDINATION'"
                          [class.text-amber-700]="ev.eventKind === 'COORDINATION'"
                        >{{ ev.eventKind === 'COORDINATION' ? '📋 Coordination Meeting' : ev.department }}</p>
                        <p class="text-[10px]"
                          [class.text-sky-500]="ev.eventKind !== 'COORDINATION'"
                          [class.text-amber-500]="ev.eventKind === 'COORDINATION'"
                        >{{ formatTimeShort(ev.startTime) }} – {{ formatTimeShort(ev.endTime) }} · {{ ev.eventKind === 'COORDINATION' ? 'Blocked' : 'Reserved' }}</p>
                      </div>
                      <ui-icon [name]="ev.eventKind === 'COORDINATION' ? 'handshake' : 'lock'"
                        class="text-sm shrink-0"
                        [class.text-sky-400]="ev.eventKind !== 'COORDINATION'"
                        [class.text-amber-400]="ev.eventKind === 'COORDINATION'" />
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
                        <span class="text-xs font-semibold text-primary">Selected</span>
                      } @else {
                        <span class="text-xs text-gray-400 group-hover:text-emerald-600 transition-colors">Available — click to select</span>
                      }
                    </div>
                  </div>
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
                      {{ formatDateShort(s.date) }} {{ formatTimeShort(s.startTime) }}–{{ formatTimeShort(s.endTime) }}
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
export class NexusRescheduleCalendar implements OnChanges {
  private readonly _events = signal<NexusRescheduleEvent[]>([]);
  @Input() set events(val: NexusRescheduleEvent[]) { this._events.set(val ?? []); }
  get events(): NexusRescheduleEvent[] { return this._events(); }

  @Input() initialSlots: ReservedDateSlot[] = [];
  @Input() eventTitle = '';
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

  getSlotEvent(hourStr: string): NexusRescheduleEvent | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this._events().find(ev => {
      if (ev.date !== day) return false;
      // Inclusive of end clock time so 08:00–12:00 highlights through 12:00
      return hour >= parseInt(ev.startTime, 10) && hour <= parseInt(ev.endTime, 10);
    }) ?? null;
  }

  isSlotSelected(hourStr: string): boolean {
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (start === null) return false;
    if (end === null) return hour === start;
    // Inclusive of end clock time so clicking 6:00 PM highlights that row
    return hour >= start && hour <= end;
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
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    if (start === null) {
      this.selectedTimeStart.set(hour); this.selectedTimeEnd.set(null); this.timeSlotError.set('');
    } else if (hour === start) {
      this.selectedTimeStart.set(null); this.selectedTimeEnd.set(null);
    } else {
      const [lo, hi] = hour > start ? [start, hour] : [hour, start];
      const conflict = this._events().find(ev => {
        if (ev.date !== this.selectedDay()) return false;
        return lo < parseInt(ev.endTime, 10) && hi > parseInt(ev.startTime, 10);
      });
      if (conflict) {
        this.timeSlotError.set('Selection overlaps with an existing reservation or coordination meeting.');
        return;
      }
      this.selectedTimeStart.set(lo); this.selectedTimeEnd.set(hi); this.timeSlotError.set('');
    }
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

  formatTimeShort(timeStr: string): string {
    return formatReadableTime(timeStr);
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
