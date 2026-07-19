import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiIcon } from '../../../shared/ui';
import { countUpcomingMaintenanceBlocks } from './maintenance.util';

export interface MaintenanceSlot {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface ExistingBlock {
  id: number;
  blockDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

/** Approved reservations / coordination meetings to show on the calendar */
export interface ScheduledEvent {
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  organization: string;
  eventKind: 'RESERVATION' | 'COORDINATION';
}

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  isToday: boolean;
  isPast: boolean;
  events: ScheduledEvent[];
  blocks: ExistingBlock[];
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
  selector: 'app-maintenance-calendar-picker',
  imports: [UiIcon, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[60] flex flex-col bg-gray-50">

      <!-- Header -->
      <div class="bg-orange-600 bg-[linear-gradient(135deg,#c2410c,#9a3412_55%,#ea580c)] text-white shadow-lg shrink-0">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-3 flex-1">
            <button type="button" (click)="cancelled.emit()"
              class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer text-sm">
              <ui-icon name="arrow_back" class="text-xl" />
            </button>
            <div>
              <h1 class="text-lg sm:text-xl font-black tracking-tight leading-tight flex items-center gap-2">
                <ui-icon name="construction" class="text-xl" />
                Maintenance Blocks — {{ facilityLabel }}
              </h1>
              <p class="text-white/70 text-xs">Select a date and time range to block on the customer calendar</p>
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
            <div class="text-white/60 text-xs">
              {{ upcomingBlockCount() }} upcoming block{{ upcomingBlockCount() === 1 ? '' : 's' }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── Calendar view ── -->
      @if (pickerView() === 'calendar') {
        <div class="flex-1 flex flex-col max-w-screen-2xl w-full mx-auto px-4 sm:px-6 py-4 gap-3 overflow-auto">
          <div class="flex-1 flex flex-col overflow-hidden rounded-xl ring-1 ring-black/5 shadow-sm bg-white">
            <div class="grid grid-cols-7 bg-orange-600 text-center text-sm font-bold text-white shrink-0">
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
                  [class.bg-orange-50]="cell.isToday"
                  [class.cursor-pointer]="cell.day !== null && !cell.isPast"
                  [class.hover:bg-orange-50]="cell.day !== null && !cell.isPast && !cell.isToday"
                  [class.ring-2]="cell.dateStr === pendingSlot()?.date"
                  [class.ring-orange-500]="cell.dateStr === pendingSlot()?.date"
                  [class.opacity-40]="cell.isPast"
                  (click)="cell.day !== null && !cell.isPast ? selectDay(cell.dateStr!) : null"
                >
                  @if (cell.day !== null) {
                    <span
                      class="mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold mb-1"
                      [class.bg-orange-500]="cell.isToday"
                      [class.text-white]="cell.isToday"
                      [class.text-gray-700]="!cell.isToday"
                    >{{ cell.day }}</span>

                    <!-- Approved events (reservations & coordination) -->
                    @if (cell.events.length > 0) {
                      <ul class="flex flex-col gap-0.5 overflow-hidden">
                        @for (ev of cell.events.slice(0, 2); track ev.department + ev.startTime) {
                          <li
                            class="min-w-0 rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight"
                            [class.border-sky-500]="ev.eventKind === 'RESERVATION'"
                            [class.bg-sky-50]="ev.eventKind === 'RESERVATION'"
                            [class.border-amber-500]="ev.eventKind === 'COORDINATION'"
                            [class.bg-amber-50]="ev.eventKind === 'COORDINATION'"
                          >
                            <span
                              class="block truncate font-bold"
                              [class.text-sky-700]="ev.eventKind === 'RESERVATION'"
                              [class.text-amber-700]="ev.eventKind === 'COORDINATION'"
                            >{{ ev.startTime }}–{{ ev.endTime }}</span>
                            <span
                              class="block truncate"
                              [class.text-sky-900]="ev.eventKind === 'RESERVATION'"
                              [class.text-amber-900]="ev.eventKind === 'COORDINATION'"
                            >{{ ev.eventKind === 'COORDINATION' ? '📋 Coordination' : ev.department }}</span>
                          </li>
                        }
                        @if (cell.events.length > 2) {
                          <li class="text-[10px] font-bold text-sky-600 pl-1">+{{ cell.events.length - 2 }} more</li>
                        }
                      </ul>
                    }

                    <!-- Maintenance blocks with inline remove -->
                    @if (cell.blocks.length > 0) {
                      <ul class="flex flex-col gap-0.5 overflow-hidden mt-0.5">
                        @for (b of cell.blocks.slice(0, 2); track b.id) {
                          <li class="min-w-0 rounded border-l-2 border-orange-500 bg-orange-50 px-1 py-0.5 text-[10px] leading-tight flex items-center gap-1">
                            <span class="flex-1 min-w-0">
                              <span class="block truncate font-bold text-orange-700">{{ b.startTime }}–{{ b.endTime }}</span>
                              <span class="block truncate text-orange-600">🔧 {{ b.reason || 'Maintenance' }}</span>
                            </span>
                            <button type="button"
                              (click)="$event.stopPropagation(); removeSlot.emit(b.id)"
                              class="shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-red-100 text-orange-500 hover:text-red-600 cursor-pointer transition-colors"
                              title="Remove block">
                              <ui-icon name="delete" class="text-[10px]" />
                            </button>
                          </li>
                        }
                        @if (cell.blocks.length > 2) {
                          <li class="text-[10px] font-bold text-orange-600 pl-1 cursor-pointer hover:underline"
                            (click)="$event.stopPropagation(); selectDay(cell.dateStr!)">
                            +{{ cell.blocks.length - 2 }} more — click to manage
                          </li>
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
              <span class="inline-block w-3 h-3 rounded border-l-2 border-sky-500 bg-sky-50"></span>
              Approved Reservation
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-amber-500 bg-amber-50"></span>
              Coordination Meeting
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded border-l-2 border-orange-500 bg-orange-50"></span>
              Maintenance Block
            </span>
            <span class="ml-auto text-[11px] italic">Click any future date to add or manage maintenance blocks</span>
          </div>

          <!-- Bottom bar: pending slot + reason + save -->
          @if (pendingSlot()) {
            <div class="shrink-0 border-t border-gray-200 bg-white shadow-lg px-4 sm:px-6 py-3">
              <div class="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="flex items-center gap-2 text-sm font-semibold text-orange-700 shrink-0">
                  <ui-icon name="construction" class="text-base text-orange-500" />
                  {{ formatDateShort(pendingSlot()!.date) }} · {{ pendingSlot()!.startTime }}–{{ pendingSlot()!.endTime }}
                </div>
                <input type="text" [(ngModel)]="pendingReason" placeholder="Reason (e.g. Under Maintenance)"
                  class="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <div class="flex gap-2 shrink-0">
                  <button type="button" (click)="pendingSlot.set(null)"
                    class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                    Clear
                  </button>
                  <button type="button" (click)="saveBlock()" [disabled]="saving()"
                    class="flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-2 text-sm font-bold text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (saving()) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                    @else { <ui-icon name="block" class="text-base" /> }
                    Add Block
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Time-slot view ── -->
      @if (pickerView() === 'timeslots') {
        <div class="flex-1 min-h-0 overflow-auto max-w-screen-md mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-4">
          <div class="flex items-center gap-2 shrink-0">
            <ui-icon name="calendar_today" class="text-orange-600 text-base" />
            <span class="text-sm font-bold text-gray-800">{{ formatDateLong(selectedDay()) }}</span>
            <span class="ml-auto text-xs text-gray-400 italic">Select start then end hour to block</span>
          </div>

          <!-- Existing blocks on this date with remove buttons -->
          @if (blocksOnSelectedDay().length > 0) {
            <div class="rounded-xl border border-orange-200 bg-orange-50/60 p-3 flex flex-col gap-2">
              <p class="text-xs font-bold uppercase tracking-wide text-orange-600 flex items-center gap-1.5">
                <ui-icon name="construction" class="text-sm" />
                Existing Blocks on This Date
              </p>
              @for (b of blocksOnSelectedDay(); track b.id) {
                <div class="flex items-center gap-3 rounded-lg bg-white border border-orange-200 px-3 py-2">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-orange-700">{{ b.startTime }} – {{ b.endTime }}</p>
                    <p class="text-[11px] text-orange-500 truncate">{{ b.reason || 'Under Maintenance' }}</p>
                  </div>
                  <button type="button" (click)="removeSlot.emit(b.id)"
                    class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                    <ui-icon name="delete" class="text-sm" />
                    Remove
                  </button>
                </div>
              }
            </div>
          }

          <!-- Time slots -->
          <div class="rounded-xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-white">
            @for (slot of timeSlots; track slot.value) {
              @if (getBlockForSlot(slot.value); as mb) {
                <!-- Existing maintenance block -->
                <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 bg-orange-50 flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-bold text-orange-700 truncate">🔧 {{ mb.reason || 'Under Maintenance' }}</p>
                      <p class="text-[10px] text-orange-500">{{ mb.startTime }} – {{ mb.endTime }} · Blocked</p>
                    </div>
                    <button type="button" (click)="removeSlot.emit(mb.id)"
                      class="flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer shrink-0">
                      <ui-icon name="delete" class="text-xs" />
                      Remove
                    </button>
                  </div>
                </div>
              } @else if (getEventForSlot(slot.value); as ev) {
                <!-- Approved reservation or coordination — not selectable -->
                <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center gap-2"
                    [class.bg-sky-50]="ev.eventKind === 'RESERVATION'"
                    [class.bg-amber-50]="ev.eventKind === 'COORDINATION'"
                  >
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-bold truncate"
                        [class.text-sky-700]="ev.eventKind === 'RESERVATION'"
                        [class.text-amber-700]="ev.eventKind === 'COORDINATION'"
                      >{{ ev.eventKind === 'COORDINATION' ? '📋 Coordination Meeting' : ev.department }}</p>
                      <p class="text-[10px]"
                        [class.text-sky-500]="ev.eventKind === 'RESERVATION'"
                        [class.text-amber-500]="ev.eventKind === 'COORDINATION'"
                      >{{ ev.startTime }} – {{ ev.endTime }} · {{ ev.eventKind === 'COORDINATION' ? 'Blocked' : 'Reserved' }}</p>
                    </div>
                    <ui-icon
                      [name]="ev.eventKind === 'COORDINATION' ? 'handshake' : 'lock'"
                      class="text-sm shrink-0"
                      [class.text-sky-400]="ev.eventKind === 'RESERVATION'"
                      [class.text-amber-400]="ev.eventKind === 'COORDINATION'"
                    />
                  </div>
                </div>
              } @else {
                <!-- Available — selectable -->
                <div
                  class="flex items-stretch border-b border-gray-100 last:border-b-0 cursor-pointer group"
                  [class.ring-2]="isHourInSelection(slot.value)"
                  [class.ring-orange-500]="isHourInSelection(slot.value)"
                  [class.bg-orange-50]="isHourInSelection(slot.value)"
                  (click)="toggleHour(slot.value)"
                >
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center gap-2 group-hover:bg-orange-50 transition-colors">
                    @if (isHourInSelection(slot.value)) {
                      <ui-icon name="check" class="text-orange-600 text-base shrink-0" />
                      <span class="text-xs font-semibold text-orange-700">Selected</span>
                    } @else {
                      <span class="text-xs text-gray-400 group-hover:text-orange-600 transition-colors">Available — click to select</span>
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

          <div class="flex gap-3 mt-2">
            <button type="button" (click)="pickerView.set('calendar')"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <ui-icon name="arrow_back" class="text-base" /> Back to Calendar
            </button>
            <button type="button" (click)="confirmTimeSlot()"
              [disabled]="selStart() === null"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              <ui-icon name="check" class="text-base" /> Confirm Slot
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class MaintenanceCalendarPicker {
  @Input() facilityLabel = '';

  // Signal-backed inputs so computed() re-runs when the parent passes new values
  private readonly _blocks = signal<ExistingBlock[]>([]);
  @Input() set existingBlocks(val: ExistingBlock[]) { this._blocks.set(val ?? []); }
  get existingBlocks(): ExistingBlock[] { return this._blocks(); }

  private readonly _events = signal<ScheduledEvent[]>([]);
  /** Approved reservations and coordination meetings — shown as read-only on the calendar */
  @Input() set events(val: ScheduledEvent[]) { this._events.set(val ?? []); }
  get events(): ScheduledEvent[] { return this._events(); }

  @Input() saving = signal(false);

  @Output() addSlot = new EventEmitter<MaintenanceSlot>();
  @Output() removeSlot = new EventEmitter<number>();
  @Output() cancelled = new EventEmitter<void>();

  readonly pickerView = signal<PickerView>('calendar');
  readonly selectedDay = signal<string | null>(null);
  readonly pendingSlot = signal<{ date: string; startTime: string; endTime: string } | null>(null);
  readonly selStart = signal<number | null>(null);
  readonly selEnd = signal<number | null>(null);
  readonly timeSlotError = signal('');

  pendingReason = '';

  private today = new Date();
  readonly activeYear = signal(this.today.getFullYear());
  readonly activeMonth = signal(this.today.getMonth());

  readonly weekdays = WEEKDAYS;
  readonly timeSlots = TIME_SLOTS;

  readonly monthLabel = computed(() =>
    new Date(this.activeYear(), this.activeMonth(), 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' })
  );

  readonly upcomingBlockCount = computed(() =>
    countUpcomingMaintenanceBlocks(this._blocks()),
  );

  readonly calendarCells = computed<CalendarCell[]>(() => {
    const year = this.activeYear();
    const month = this.activeMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.fmt(today);
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.max(5, Math.ceil((firstWeekday + daysInMonth) / 7)) * 7;

    return Array.from({ length: cellCount }, (_, i) => {
      const dayOffset = i - firstWeekday;
      if (dayOffset < 0 || dayOffset >= daysInMonth) {
        return { day: null, dateStr: null, isToday: false, isPast: false, events: [], blocks: [] };
      }
      const day = dayOffset + 1;
      const dateStr = this.fmt(new Date(year, month, day));
      return {
        day, dateStr,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        events: this._events().filter(e => e.date === dateStr),
        blocks: this._blocks().filter(b => b.blockDate === dateStr),
      };
    });
  });

  readonly calendarRows = computed(() =>
    `repeat(${this.calendarCells().length / 7}, minmax(5rem, 1fr))`
  );

  readonly blocksOnSelectedDay = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this._blocks().filter(b => b.blockDate === day);
  });

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

  getBlockForSlot(hourStr: string): ExistingBlock | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this._blocks().find(b => {
      if (b.blockDate !== day) return false;
      return hour >= parseInt(b.startTime, 10) && hour < parseInt(b.endTime, 10);
    }) ?? null;
  }

  getEventForSlot(hourStr: string): ScheduledEvent | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this._events().find(ev => {
      if (ev.date !== day) return false;
      return hour >= parseInt(ev.startTime, 10) && hour < parseInt(ev.endTime, 10);
    }) ?? null;
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
      const day = this.selectedDay();
      // Check conflict with maintenance blocks
      const blockConflict = this._blocks().find(b => {
        if (b.blockDate !== day) return false;
        return lo < parseInt(b.endTime, 10) && hi > parseInt(b.startTime, 10);
      });
      if (blockConflict) {
        this.timeSlotError.set('Selection overlaps with an existing maintenance block.');
        return;
      }
      // Check conflict with approved events
      const eventConflict = this._events().find(ev => {
        if (ev.date !== day) return false;
        return lo < parseInt(ev.endTime, 10) && hi > parseInt(ev.startTime, 10);
      });
      if (eventConflict) {
        this.timeSlotError.set('Selection overlaps with an approved reservation or coordination meeting.');
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
    this.pendingSlot.set({
      date: day,
      startTime: `${String(start).padStart(2, '0')}:00`,
      endTime: `${String(end).padStart(2, '0')}:00`,
    });
    this.selStart.set(null);
    this.selEnd.set(null);
    this.pickerView.set('calendar');
  }

  saveBlock(): void {
    const slot = this.pendingSlot();
    if (!slot) return;
    this.addSlot.emit({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      reason: this.pendingReason.trim() || 'Under Maintenance',
    });
    this.pendingSlot.set(null);
    this.pendingReason = '';
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
