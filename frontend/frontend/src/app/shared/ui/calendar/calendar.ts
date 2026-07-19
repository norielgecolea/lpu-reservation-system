import { ChangeDetectionStrategy, Component, computed, input, signal, output } from '@angular/core';
import { UiIcon } from '../icon/icon';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  selector: 'ui-calendar',
  imports: [UiIcon, BrnButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full text-gray-900',
  },
  template: `
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between" [class.hidden]="mode() === 'multi'">
          <div class="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button 
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 cursor-pointer"
            [class.bg-white]="viewMode() === 'month'"
            [class.text-primary]="viewMode() === 'month'"
            [class.shadow-sm]="viewMode() === 'month'"
            [class.text-gray-600]="viewMode() !== 'month'"
            [class.hover:bg-white]="viewMode() !== 'month'"
            (click)="viewMode.set('month')"
          >
            Monthly
          </button>
          <button 
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 cursor-pointer"
            [class.bg-white]="viewMode() === 'week'"
            [class.text-primary]="viewMode() === 'week'"
            [class.shadow-sm]="viewMode() === 'week'"
            [class.text-gray-600]="viewMode() !== 'week'"
            [class.hover:bg-white]="viewMode() !== 'week'"
            (click)="viewMode.set('week')"
          >
            Weekly
          </button>
        </div>
      </div>

        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold tracking-tight text-gray-900">{{ headerLabel() }}</h3>
          <div class="flex gap-1.5">
            @if (hasAnySelection()) {
              <button
                brnButton
                type="button"
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors mr-1"
                (click)="resetSelection()"
                title="Reset Selection"
              >
                <ui-icon name="refresh" class="text-lg" />
              </button>
            }
          <button
            brnButton
            type="button"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            (click)="previous()"
          >
            <ui-icon name="chevron_left" class="text-lg" />
          </button>
          <button
            brnButton
            type="button"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            (click)="next()"
          >
            <ui-icon name="chevron_right" class="text-lg" />
          </button>
        </div>
      </div>

      @if (viewMode() === 'month') {
        <div class="grid grid-cols-7 gap-1 text-center">
          @for (day of weekDays; track day) {
            <div class="text-xs font-semibold text-gray-500 pb-2">{{ day }}</div>
          }
          @for (blank of blankDays(); track $index) {
            <div></div>
          }
          @for (day of daysInMonth(); track day) {
            <div
              class="flex h-9 w-9 mx-auto items-center justify-center rounded-full text-sm text-gray-700 transition-all duration-200"
              [class.bg-primary]="isOccupied(day)"
              [class.text-white]="isOccupied(day)"
              [class.font-bold]="isOccupied(day) || (mode() === 'range' && isMonthSelected(day) && !isOccupied(day)) || (mode() === 'multi' && isMultiSelected(day) && !isOccupied(day))"
              [class.shadow-md]="isOccupied(day)"
              [class.bg-yellow-400]="(mode() === 'range' && isMonthSelected(day) && !isOccupied(day)) || (mode() === 'multi' && isMultiSelected(day) && !isOccupied(day))"
              [class.text-zinc-900]="(mode() === 'range' && isMonthSelected(day) && !isOccupied(day)) || (mode() === 'multi' && isMultiSelected(day) && !isOccupied(day))"
              [class.shadow-[0_0_10px_rgba(250,204,21,0.6)]]="(mode() === 'range' && isMonthSelected(day) && !isOccupied(day)) || (mode() === 'multi' && isMultiSelected(day) && !isOccupied(day))"
              [class.bg-yellow-100]="mode() === 'range' && isMonthInRange(day) && !isOccupied(day)"
              [class.text-yellow-800]="mode() === 'range' && isMonthInRange(day) && !isOccupied(day)"
              [class.hover:bg-gray-100]="!isOccupied(day) && !isPastDate(day) && (mode() === 'range' ? !isMonthSelected(day) && !isMonthInRange(day) : !isMultiSelected(day))"
              [class.cursor-pointer]="!isOccupied(day) && !isPastDate(day)"
              [class.opacity-50]="!isOccupied(day) && isPastDate(day)"
              [attr.title]="isOccupied(day) ? 'Occupied' : 'Available'"
              (click)="mode() === 'multi' ? onMultiDayClick(day) : onMonthDayClick(day)"
            >
              {{ day }}
            </div>
          }
        </div>
      } @else {
        <div class="flex flex-col -mx-2 px-2 flex-1">
          <div class="grid grid-cols-[40px_repeat(6,1fr)] gap-x-1 mb-2">
            <div></div>
            @for (day of weekDaysList(); track day.date.getTime()) {
              <div class="flex flex-col items-center justify-center rounded-t-lg border-b-2 bg-gray-50 py-1.5" [class.border-primary]="isToday(day.date)" [class.border-transparent]="!isToday(day.date)">
                <span class="text-[10px] font-medium uppercase tracking-wider text-gray-500">{{ day.dayName }}</span>
                <span class="text-sm font-bold" [class.text-primary]="isToday(day.date)" [class.text-gray-800]="!isToday(day.date)">{{ day.dayNumber }}</span>
              </div>
            }
          </div>
          
          <div class="flex-1 grid grid-cols-[40px_repeat(6,1fr)] gap-x-1 gap-y-[3px]">
            @for (hour of hours; track hour.val) {
              <div class="text-[10px] font-medium text-gray-400 text-right pr-2 self-center relative top-[-2px]">{{ hour.label }}</div>
              @for (day of weekDaysList(); track day.date.getTime()) {
                <div 
                  class="h-7 rounded-[4px] border transition-all duration-200"
                  [class.bg-primary]="isAllocated(day.date, hour.val)"
                  [class.border-transparent]="isAllocated(day.date, hour.val) || isWeekSelected(day.date, hour.val) || isWeekInRange(day.date, hour.val)"
                  [class.shadow-[0_0_10px_rgba(95,24,48,0.25)]]="isAllocated(day.date, hour.val)"
                  [class.bg-yellow-400]="isWeekSelected(day.date, hour.val) && !isAllocated(day.date, hour.val)"
                  [class.shadow-[0_0_10px_rgba(250,204,21,0.5)]]="isWeekSelected(day.date, hour.val) && !isAllocated(day.date, hour.val)"
                  [class.bg-yellow-100]="isWeekInRange(day.date, hour.val) && !isAllocated(day.date, hour.val)"
                  [class.bg-gray-50]="!isAllocated(day.date, hour.val) && !isWeekSelected(day.date, hour.val) && !isWeekInRange(day.date, hour.val)"
                  [class.border-gray-200]="!isAllocated(day.date, hour.val) && !isWeekSelected(day.date, hour.val) && !isWeekInRange(day.date, hour.val)"
                  [class.hover:border-primary/40]="!isAllocated(day.date, hour.val) && !isPastDateTime(day.date, hour.val) && !isWeekSelected(day.date, hour.val) && !isWeekInRange(day.date, hour.val)"
                  [class.opacity-40]="!isAllocated(day.date, hour.val) && isPastDateTime(day.date, hour.val)"
                  [class.cursor-pointer]="!isAllocated(day.date, hour.val) && !isPastDateTime(day.date, hour.val)"
                  [attr.title]="isAllocated(day.date, hour.val) ? 'Allocated: ' + hour.label : 'Available: ' + hour.label"
                  (click)="onWeekHourClick(day.date, hour.val)"
                ></div>
              }
            }
          </div>
        </div>
      }
      
      <div class="flex items-center gap-4 mt-1 border-t border-gray-200 pt-4 text-sm text-gray-600">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-primary shadow-sm"></div>
          <span class="text-xs font-medium">Occupied</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full border border-gray-300 bg-gray-50"></div>
          <span class="text-xs font-medium">Available</span>
        </div>
        @if (hasAnySelection()) {
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
            <span class="text-xs font-medium text-yellow-700">
              @if (mode() === 'multi') {
                {{ selectedMultiDates().size }} date(s) selected
              } @else {
                Selected
              }
            </span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .hidden-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .hidden-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .hidden-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 4px;
    }
    .hidden-scrollbar:hover::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.25);
    }
  `]
})
export class UiCalendar {
  readonly occupiedDates = input<string[]>([]);
  readonly mode = input<'range' | 'multi'>('range');
  readonly selectionChanged = output<{startDate?: string, endDate?: string, startTime?: string, endTime?: string}>();
  readonly datesChanged = output<string[]>();

  protected viewMode = signal<'month' | 'week'>('month');
  protected currentDate = signal(new Date());

  protected selectedStart = signal<number | null>(null);
  protected selectedEnd = signal<number | null>(null);
  protected selectedMultiDates = signal<Set<string>>(new Set());

  protected hasAnySelection = computed(() =>
    this.mode() === 'multi'
      ? this.selectedMultiDates().size > 0
      : this.selectedStart() !== null || this.selectedEnd() !== null
  );

  protected isMultiSelected(day: number): boolean {
    const date = this.currentDate();
    const dateStr = this.formatDate(new Date(date.getFullYear(), date.getMonth(), day));
    return this.selectedMultiDates().has(dateStr);
  }

  protected onMultiDayClick(day: number): void {
    if (this.isOccupied(day) || this.isPastDate(day)) return;
    const date = this.currentDate();
    const dateStr = this.formatDate(new Date(date.getFullYear(), date.getMonth(), day));
    this.selectedMultiDates.update(set => {
      const next = new Set(set);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
    this.datesChanged.emit(Array.from(this.selectedMultiDates()));
  }

  protected resetSelection() {
    if (this.mode() === 'multi') {
      this.selectedMultiDates.set(new Set());
      this.datesChanged.emit([]);
    } else {
      this.selectedStart.set(null);
      this.selectedEnd.set(null);
      this.selectionChanged.emit({
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: ''
      });
    }
  }

  private getWeekSlotIndex(time: number): number {
    const d = new Date(time);
    const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return days * 15 + (d.getHours() - 7);
  }

  private handleSelection(clickedValue: number, currentStart: number | null, currentEnd: number | null): [number | null, number | null] {
    let candidateStart: number | null = null;
    let candidateEnd: number | null = null;

    if (currentStart === null && currentEnd === null) {
      return [clickedValue, null];
    } else if (currentStart !== null && currentEnd === null) {
      candidateStart = clickedValue < currentStart ? clickedValue : currentStart;
      candidateEnd = clickedValue < currentStart ? currentStart : clickedValue;
    } else if (currentStart !== null && currentEnd !== null) {
      let distStart = Math.abs(clickedValue - currentStart);
      let distEnd = Math.abs(clickedValue - currentEnd);

      if (this.viewMode() === 'week') {
        distStart = Math.abs(this.getWeekSlotIndex(clickedValue) - this.getWeekSlotIndex(currentStart));
        distEnd = Math.abs(this.getWeekSlotIndex(clickedValue) - this.getWeekSlotIndex(currentEnd));
      }

      let newStart: number;
      let newEnd: number;
      if (distStart < distEnd) {
        newStart = clickedValue;
        newEnd = currentEnd;
      } else {
        newStart = currentStart;
        newEnd = clickedValue;
      }
      
      candidateStart = newStart < newEnd ? newStart : newEnd;
      candidateEnd = newStart < newEnd ? newEnd : newStart;
    }

    if (candidateStart !== null && candidateEnd !== null) {
      if (this.isRangeClear(candidateStart, candidateEnd)) {
        return [candidateStart, candidateEnd];
      } else {
        return [clickedValue, null];
      }
    }
    
    return [null, null];
  }

  private isRangeClear(start: number, end: number): boolean {
    if (this.viewMode() === 'week') {
      for (let t = start; t <= end; t += 3600000) {
        const d = new Date(t);
        if (d.getHours() >= 7 && d.getHours() <= 21) {
          if (this.isAllocated(d, d.getHours()) || this.isPastDateTime(d, d.getHours())) {
            return false;
          }
        }
      }
    } else {
      let current = new Date(start);
      current.setHours(0,0,0,0);
      const endDay = new Date(end);
      endDay.setHours(0,0,0,0);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      while (current <= endDay) {
        if (this.isDateOccupied(current) || current < today) {
          return false;
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return true;
  }

  protected onMonthDayClick(day: number) {
    if (this.isOccupied(day) || this.isPastDate(day)) return;
    const date = this.currentDate();
    const clickedTime = new Date(date.getFullYear(), date.getMonth(), day, 8).getTime();
    
    const [newStart, newEnd] = this.handleSelection(clickedTime, this.selectedStart(), this.selectedEnd());
    this.selectedStart.set(newStart);
    this.selectedEnd.set(newEnd);

    this.emitSelection(newStart, newEnd);
  }

  protected onWeekHourClick(date: Date, hour: number) {
    if (this.isAllocated(date, hour) || this.isPastDateTime(date, hour)) return;
    const clickedTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime();
    
    const [newStart, newEnd] = this.handleSelection(clickedTime, this.selectedStart(), this.selectedEnd());
    this.selectedStart.set(newStart);
    this.selectedEnd.set(newEnd);

    this.emitSelection(newStart, newEnd);
  }

  private emitSelection(start: number | null, end: number | null) {
    const update: any = {};
    if (start) {
      const d = new Date(start);
      update.startDate = this.formatDate(d);
      update.startTime = `${String(d.getHours()).padStart(2, '0')}:00`;
    }
    if (end) {
      const d = new Date(end);
      update.endDate = this.formatDate(d);
      update.endTime = `${String(d.getHours() + 1).padStart(2, '0')}:00`;
    } else if (start) {
      const d = new Date(start);
      update.endDate = update.startDate;
      update.endTime = `${String(d.getHours() + 1).padStart(2, '0')}:00`;
    }
    this.selectionChanged.emit(update);
  }

  private isSameDay(date1: Date, time2: number | null): boolean {
    if (time2 === null) return false;
    const date2 = new Date(time2);
    return date1.getFullYear() === date2.getFullYear() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getDate() === date2.getDate();
  }

  protected isMonthSelected(day: number): boolean {
    const cellDate = new Date(this.currentDate().getFullYear(), this.currentDate().getMonth(), day);
    return this.isSameDay(cellDate, this.selectedStart()) || this.isSameDay(cellDate, this.selectedEnd());
  }

  protected isMonthInRange(day: number): boolean {
    const cellTime = new Date(this.currentDate().getFullYear(), this.currentDate().getMonth(), day).getTime();
    const start = this.selectedStart();
    const end = this.selectedEnd();
    
    if (start === null || end === null) return false;
    const startDay = new Date(start).setHours(0,0,0,0);
    const endDay = new Date(end).setHours(0,0,0,0);
    
    return cellTime > startDay && cellTime < endDay;
  }

  protected isWeekSelected(date: Date, hour: number): boolean {
    const t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime();
    return t === this.selectedStart() || t === this.selectedEnd();
  }

  protected isWeekInRange(date: Date, hour: number): boolean {
    const t = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime();
    const start = this.selectedStart();
    const end = this.selectedEnd();
    return start !== null && end !== null && t > start && t < end;
  }

  protected weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  protected hours = Array.from({ length: 15 }, (_, i) => {
    const val = i + 7; // 7 to 21 (7am to 9pm)
    const label = val > 12 ? `${val - 12} PM` : val === 12 ? '12 PM' : `${val} AM`;
    return { val, label };
  });

  protected headerLabel = computed(() => {
    const date = this.currentDate();
    if (this.viewMode() === 'month') {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      const days = this.weekDaysList();
      if (days.length === 0) return '';
      const start = days[0].date;
      const end = days[days.length - 1].date;
      
      const startMonth = start.toLocaleString('default', { month: 'short' });
      const endMonth = end.toLocaleString('default', { month: 'short' });
      
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
      }
    }
  });

  protected weekDaysList = computed(() => {
    const curr = new Date(this.currentDate());
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(curr.setDate(diff));
    
    // Monday to Saturday (6 days)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        dayName: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][i],
        dayNumber: d.getDate()
      };
    });
  });

  protected blankDays = computed(() => {
    const date = this.currentDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return Array.from({ length: firstDay });
  });

  protected daysInMonth = computed(() => {
    const date = this.currentDate();
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  });

  protected previous() {
    this.currentDate.update((date) => {
      if (this.viewMode() === 'month') {
        return new Date(date.getFullYear(), date.getMonth() - 1, 1);
      } else {
        const d = new Date(date);
        d.setDate(d.getDate() - 7);
        return d;
      }
    });
  }

  protected next() {
    this.currentDate.update((date) => {
      if (this.viewMode() === 'month') {
        return new Date(date.getFullYear(), date.getMonth() + 1, 1);
      } else {
        const d = new Date(date);
        d.setDate(d.getDate() + 7);
        return d;
      }
    });
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private isDateOccupied(date: Date): boolean {
    const dateString = this.formatDate(date);
    return this.occupiedDates().includes(dateString);
  }

  protected isOccupied(day: number): boolean {
    const date = this.currentDate();
    const cellDate = new Date(date.getFullYear(), date.getMonth(), day);
    return this.isDateOccupied(cellDate);
  }
  
  protected isPastDate(day: number): boolean {
    const date = this.currentDate();
    const checkDate = new Date(date.getFullYear(), date.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkDate < today;
  }
  
  protected isPastDateTime(date: Date, hour: number): boolean {
    const checkDate = new Date(date);
    checkDate.setHours(hour, 0, 0, 0);
    return checkDate < new Date();
  }

  protected isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }

  protected isAllocated(date: Date, hour: number): boolean {
    const dateString = this.formatDate(date);
    
    // Explicit occupied dates
    if (this.occupiedDates().includes(dateString)) {
       return (hour >= 9 && hour <= 11) || (hour >= 13 && hour <= 15);
    }
    
    // Pseudo-random allocations based on date hash
    const hash = date.getDate() * 17 + date.getMonth() * 31 + date.getFullYear();
    
    if (hash % 5 === 0) return hour >= 10 && hour <= 12;
    if (hash % 7 === 0) return hour >= 14 && hour <= 16;
    if (hash % 11 === 0) return hour >= 8 && hour <= 9;
    
    return false;
  }
}
