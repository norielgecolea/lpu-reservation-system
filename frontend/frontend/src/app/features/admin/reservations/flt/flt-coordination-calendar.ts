import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { UiIcon } from '../../../../shared/ui';
import { RescheduleEvent } from './flt-reschedule-calendar';

export interface CoordinationSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  isToday: boolean;
  isPast: boolean;
  events: RescheduleEvent[];
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
  selector: 'app-flt-coordination-calendar',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Full-screen overlay -->
    <div class="fixed inset-0 z-50 flex min-h-0 flex-col bg-gray-50">

      <!-- Header -->
      <div class="bg-amber-600 bg-[linear-gradient(135deg,#b45309,#92400e_55%,#d97706)] text-white shadow-lg shrink-0">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3 flex-1">
            <button type="button" (click)="cancelled.emit()"
              class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer text-sm">
              <ui-icon name="arrow_back" class="text-xl" />
            </button>
            <div>
              <h1 class="text-lg sm:text-xl font-black tracking-tight leading-tight">Set Coordination Meeting</h1>
              <p class="text-white/70 text-xs">{{ eventTitle }} — pick a date and time for the pre-event coordination</p>
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

      <!-- ── Calendar view ── -->
      @if (pickerView() === 'calendar') {
        <div class="flex-1 flex flex-col max-w-screen-2xl w-full mx-auto px-4 sm:px-6 py-4 gap-3 overflow-auto">
          <div class="flex-1 flex flex-col overflow-hidden rounded-xl ring-1 ring-black/5 shadow-sm bg-white">
            <div class="grid grid-cols-7 bg-amber-600 text-center text-sm font-bold text-white shrink-0">
              @for (wd of weekdays; track wd) {
                <div class="border-r border-white/30 px-1 py-2.5 last:border-r-0 text-xs sm:text-sm">{{ wd }}</div>
              }
            </div>
            <div class="flex-1 grid grid-cols-7 overflow-auto" [style.grid-template-rows]="calendarRows()">
              @for (cell of calendarCells(); track $index) {
                <div
                  class="flex flex-col border-r border-b border-gray-100 bg-white p-1 sm:p-2 min-h-16 sm:min-h-20 transition-colors"
                  [class.bg-gray-50]="cell.day !== null && !cell.isToday"
                  [class.bg-gray-100]="cell.day === null"
                  [class.bg-amber-50]="cell.isToday"
                  [class.bg-emerald-50]="isTargetEventDate(cell.dateStr)"
                  [class.cursor-pointer]="cell.day !== null && !cell.isPast"
                  [class.hover:bg-amber-50]="cell.day !== null && !cell.isPast && !cell.isToday && !isTargetEventDate(cell.dateStr)"
                  [class.ring-2]="cell.dateStr === selectedSlot()?.date || isTargetEventDate(cell.dateStr)"
                  [class.ring-amber-500]="cell.dateStr === selectedSlot()?.date"
                  [class.ring-emerald-500]="isTargetEventDate(cell.dateStr) && cell.dateStr !== selectedSlot()?.date"
                  [class.ring-inset]="isTargetEventDate(cell.dateStr) && cell.dateStr !== selectedSlot()?.date"
                  [class.opacity-40]="cell.isPast"
                  (click)="cell.day !== null && !cell.isPast ? selectDay(cell.dateStr!) : null"
                >
                  @if (cell.day !== null) {
                    <span
                      class="mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold mb-1"
                      [class.bg-amber-500]="cell.isToday"
                      [class.text-white]="cell.isToday"
                      [class.text-gray-700]="!cell.isToday"
                    >{{ cell.day }}</span>
                    @if (cell.events.length > 0) {
                      <ul class="flex flex-col gap-0.5 overflow-hidden">
                        @for (ev of cell.events.slice(0, 3); track ev.department + ev.startTime) {
                          <li
                            class="min-w-0 rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight"
                            [class.border-emerald-500]="ev.eventKind === 'TARGET'"
                            [class.bg-emerald-50]="ev.eventKind === 'TARGET'"
                            [class.border-sky-500]="ev.eventKind === 'RESERVATION'"
                            [class.bg-sky-50]="ev.eventKind === 'RESERVATION'"
                            [class.border-amber-500]="ev.eventKind === 'COORDINATION'"
                            [class.bg-amber-50]="ev.eventKind === 'COORDINATION'"
                          >
                            <span
                              class="block truncate font-bold"
                              [class.text-emerald-700]="ev.eventKind === 'TARGET'"
                              [class.text-sky-700]="ev.eventKind === 'RESERVATION'"
                              [class.text-amber-700]="ev.eventKind === 'COORDINATION'"
                            >{{ ev.startTime }}–{{ ev.endTime }}</span>
                            <span
                              class="block truncate"
                              [class.text-emerald-900]="ev.eventKind === 'TARGET'"
                              [class.text-sky-900]="ev.eventKind === 'RESERVATION'"
                              [class.text-amber-900]="ev.eventKind === 'COORDINATION'"
                            >{{ ev.eventKind === 'COORDINATION' ? '📋 Coordination' : ev.eventKind === 'TARGET' ? (ev.eventTitle || eventTitle) : ev.department }}</span>
                          </li>
                        }
                        @if (cell.events.length > 3) {
                          <li class="text-[10px] font-bold text-amber-600 pl-1">+{{ cell.events.length - 3 }} more</li>
                        }
                      </ul>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap items-center gap-4 shrink-0 text-xs text-gray-500">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-emerald-500 bg-emerald-50"></span>
              {{ eventTitle }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-sky-500 bg-sky-50"></span>
              Approved Reservation
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-amber-500 bg-amber-50"></span>
              Coordination Meeting
            </span>
            <span class="ml-auto text-[11px] italic">Click a date to select the coordination time slot</span>
          </div>

          <!-- Bottom bar: selected slot preview + save -->
          @if (selectedSlot()) {
            <div class="shrink-0 border-t border-gray-200 bg-white shadow-lg px-4 sm:px-6 py-3">
              <div class="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <ui-icon name="handshake" class="text-base text-amber-500" />
                  {{ formatDateShort(selectedSlot()!.date) }} · {{ selectedSlot()!.startTime }}–{{ selectedSlot()!.endTime }}
                </div>
                <div class="flex gap-2 sm:ml-auto">
                  <button type="button" (click)="selectedSlot.set(null)"
                    class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                    Clear
                  </button>
                  <button type="button" (click)="save()"
                    [disabled]="saving()"
                    class="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-5 py-2 text-sm font-bold text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (saving()) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                    @else { <ui-icon name="save" class="text-base" /> }
                    Save Coordination
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Time-slot view ── -->
      @if (pickerView() === 'timeslots') {
        <div class="flex min-h-0 flex-1 flex-col max-w-screen-md mx-auto w-full px-4 sm:px-6 py-4">
          <div class="flex shrink-0 items-center gap-2">
            <ui-icon name="calendar_today" class="text-amber-600 text-base" />
            <span class="text-sm font-bold text-gray-800">{{ formatDateLong(selectedDay()) }}</span>
            <span class="ml-auto text-xs text-gray-400 italic">Select start then end hour</span>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto py-3 flex flex-col gap-4" style="scrollbar-width: thin">
          <div class="rounded-xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white">
            @for (slot of timeSlots; track slot.value) {
              @if (getSlotEvent(slot.value); as ev) {
                <!-- Booked slot -->
                <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div
                    class="flex-1 px-3 py-2.5 flex items-center gap-2"
                    [class.bg-emerald-50]="ev.eventKind === 'TARGET'"
                    [class.bg-sky-50]="ev.eventKind === 'RESERVATION'"
                    [class.bg-amber-50]="ev.eventKind === 'COORDINATION'"
                  >
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-xs font-bold truncate"
                        [class.text-emerald-700]="ev.eventKind === 'TARGET'"
                        [class.text-sky-700]="ev.eventKind === 'RESERVATION'"
                        [class.text-amber-700]="ev.eventKind === 'COORDINATION'"
                      >{{ ev.eventKind === 'COORDINATION' ? '📋 Coordination Meeting' : ev.eventKind === 'TARGET' ? (ev.eventTitle || eventTitle) : ev.department }}</p>
                      <p
                        class="text-[10px]"
                        [class.text-emerald-500]="ev.eventKind === 'TARGET'"
                        [class.text-sky-500]="ev.eventKind === 'RESERVATION'"
                        [class.text-amber-500]="ev.eventKind === 'COORDINATION'"
                      >{{ ev.startTime }} – {{ ev.endTime }} · {{ ev.eventKind === 'COORDINATION' ? 'Blocked' : ev.eventKind === 'TARGET' ? 'Reserved' : 'Reserved' }}</p>
                    </div>
                    <ui-icon
                      [name]="ev.eventKind === 'COORDINATION' ? 'handshake' : ev.eventKind === 'TARGET' ? 'event' : 'lock'"
                      class="text-sm shrink-0"
                      [class.text-emerald-400]="ev.eventKind === 'TARGET'"
                      [class.text-sky-400]="ev.eventKind === 'RESERVATION'"
                      [class.text-amber-400]="ev.eventKind === 'COORDINATION'"
                    />
                  </div>
                </div>
              } @else {
                <!-- Available -->
                <div
                  class="flex items-stretch border-b border-gray-100 last:border-b-0 cursor-pointer group"
                  [class.ring-2]="isHourInSelection(slot.value)"
                  [class.ring-amber-500]="isHourInSelection(slot.value)"
                  [class.bg-amber-50]="isHourInSelection(slot.value)"
                  (click)="toggleHour(slot.value)"
                >
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center gap-2 group-hover:bg-amber-50 transition-colors">
                    @if (isHourInSelection(slot.value)) {
                      <ui-icon name="check" class="text-amber-600 text-base shrink-0" />
                      <span class="text-xs font-semibold text-amber-700">Selected</span>
                    } @else {
                      <span class="text-xs text-gray-400 group-hover:text-amber-600 transition-colors">Available — click to select</span>
                    }
                  </div>
                </div>
              }
            }
          </div>

          @if (timeSlotError()) {
            <p class="text-sm text-red-500 flex items-center gap-1.5">
              <ui-icon name="warning" class="text-base" />{{ timeSlotError() }}
            </p>
          }
          </div>

          <div class="shrink-0 flex gap-3 border-t border-gray-200 bg-gray-50 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" (click)="pickerView.set('calendar')"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <ui-icon name="arrow_back" class="text-base" /> Back
            </button>
            <button type="button" (click)="confirmTimeSlot()"
              [disabled]="selStart() === null"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              <ui-icon name="check" class="text-base" /> Confirm Slot
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class FltCoordinationCalendar {
  @Input() events: RescheduleEvent[] = [];
  @Input() eventTitle = '';
  @Input() saving = signal(false);
  /** Pre-existing coordination slot to highlight on open (if any) */
  @Input() set initial(v: CoordinationSlot | null) {
    if (v) {
      this.selectedSlot.set(v);
      // Jump to that month
      const [y, m] = v.date.split('-').map(Number);
      this.activeYear.set(y);
      this.activeMonth.set(m - 1);
    }
  }
  @Output() saved = new EventEmitter<CoordinationSlot>();
  @Output() cancelled = new EventEmitter<void>();

  readonly pickerView = signal<PickerView>('calendar');
  readonly selectedDay = signal<string | null>(null);
  readonly selectedSlot = signal<CoordinationSlot | null>(null);
  readonly selStart = signal<number | null>(null);
  readonly selEnd = signal<number | null>(null);
  readonly timeSlotError = signal('');

  readonly activeYear = signal(new Date().getFullYear());
  readonly activeMonth = signal(new Date().getMonth());

  readonly weekdays = WEEKDAYS;
  readonly timeSlots = TIME_SLOTS;

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
    const evs = this.events;

    return Array.from({ length: cellCount }, (_, i) => {
      const dayOffset = i - firstWeekday;
      if (dayOffset < 0 || dayOffset >= daysInMonth) {
        return { day: null, dateStr: null, isToday: false, isPast: false, events: [] };
      }
      const day = dayOffset + 1;
      const dateStr = this.fmt(new Date(year, month, day));
      return {
        day, dateStr,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        events: evs.filter(e => e.date === dateStr),
      };
    });
  });

  readonly calendarRows = computed(() =>
    `repeat(${this.calendarCells().length / 7}, minmax(5rem, 1fr))`
  );

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
    this.selStart.set(null);
    this.selEnd.set(null);
    this.timeSlotError.set('');
    this.pickerView.set('timeslots');
  }

  getSlotEvent(hourStr: string): RescheduleEvent | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this.events.find(ev => {
      if (ev.date !== day) return false;
      return hour >= parseInt(ev.startTime, 10) && hour < parseInt(ev.endTime, 10);
    }) ?? null;
  }

  isTargetEventDate(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return this.events.some(ev => ev.date === dateStr && ev.eventKind === 'TARGET');
  }

  isHourInSelection(hourStr: string): boolean {
    const hour = parseInt(hourStr, 10);
    const start = this.selStart();
    const end = this.selEnd();
    if (start === null) return false;
    if (end === null) return hour === start;
    return hour >= start && hour < end;
  }

  toggleHour(hourStr: string): void {
    const hour = parseInt(hourStr, 10);
    const start = this.selStart();
    if (start === null) {
      this.selStart.set(hour);
      this.selEnd.set(null);
      this.timeSlotError.set('');
    } else if (hour === start) {
      this.selStart.set(null);
      this.selEnd.set(null);
    } else {
      const [lo, hi] = hour > start ? [start, hour + 1] : [hour, start + 1];
      const conflict = this.events.find(ev => {
        if (ev.date !== this.selectedDay()) return false;
        const es = parseInt(ev.startTime, 10);
        const ee = parseInt(ev.endTime, 10);
        return lo < ee && hi > es;
      });
      if (conflict) {
        this.timeSlotError.set('Selection overlaps with an existing event or coordination meeting.');
        return;
      }
      this.selStart.set(lo);
      this.selEnd.set(hi);
      this.timeSlotError.set('');
    }
  }

  confirmTimeSlot(): void {
    const day = this.selectedDay();
    const start = this.selStart();
    if (!day || start === null) return;
    const end = this.selEnd() ?? start + 1;
    this.selectedSlot.set({
      date: day,
      startTime: `${String(start).padStart(2, '0')}:00`,
      endTime: `${String(end).padStart(2, '0')}:00`,
    });
    this.selStart.set(null);
    this.selEnd.set(null);
    this.pickerView.set('calendar');
  }

  save(): void {
    const s = this.selectedSlot();
    if (s) this.saved.emit(s);
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
