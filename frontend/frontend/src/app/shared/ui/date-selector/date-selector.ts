import { ChangeDetectionStrategy, Component, computed, model, signal } from '@angular/core';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnPopover, BrnPopoverImports } from '@spartan-ng/brain/popover';

import { UiIcon } from '../icon/icon';

interface MonthOption {
  label: string;
  shortLabel: string;
  value: number;
}

type PickerView = 'month' | 'year';

const YEAR_PAGE_SIZE = 12;

const MONTHS: MonthOption[] = [
  { label: 'January', shortLabel: 'Jan', value: 0 },
  { label: 'February', shortLabel: 'Feb', value: 1 },
  { label: 'March', shortLabel: 'Mar', value: 2 },
  { label: 'April', shortLabel: 'Apr', value: 3 },
  { label: 'May', shortLabel: 'May', value: 4 },
  { label: 'June', shortLabel: 'Jun', value: 5 },
  { label: 'July', shortLabel: 'Jul', value: 6 },
  { label: 'August', shortLabel: 'Aug', value: 7 },
  { label: 'September', shortLabel: 'Sep', value: 8 },
  { label: 'October', shortLabel: 'Oct', value: 9 },
  { label: 'November', shortLabel: 'Nov', value: 10 },
  { label: 'December', shortLabel: 'Dec', value: 11 },
];

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  if (!Number.isInteger(year) || month < 0 || month > 11) {
    return null;
  }

  return { year, month };
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getYearRangeStart(year: number): number {
  return Math.floor(year / 10) * 10;
}

/** Month/year picker. Styled like the segmented control, built on spartan/brain button + popover. */
@Component({
  selector: 'ui-date-selector',
  imports: [BrnButtonImports, BrnPopoverImports, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block sm:inline-block',
  },
  template: `
    <brn-popover #datePopover="brnPopover" sideOffset="6" align="start">
      <button
        brnButton
        brnPopoverTrigger
        type="button"
        (click)="syncPickerYear()"
        class="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg bg-white px-2.5 text-sm font-bold leading-none text-gray-600 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_2px_6px_-2px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-black/5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-secondary hover:text-white hover:ring-transparent active:scale-[0.97] sm:w-auto sm:justify-center sm:px-4"
      >
        <ui-icon name="calendar_today" class="text-sm" />
        <span>{{ displayValue() }}</span>
        <ui-icon name="expand_more" class="text-sm" />
      </button>

      <ng-template brnPopoverContent>
        <div
          class="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-lg"
        >
          <div class="flex items-center justify-between gap-2">
            <button
              brnButton
              type="button"
              [attr.aria-label]="pickerView() === 'year' ? 'Previous years' : 'Previous year'"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-secondary/10 hover:text-primary"
              (click)="shiftHeader(-1)"
            >
              <ui-icon name="chevron_left" class="text-lg" />
            </button>

            <button
              brnButton
              type="button"
              [attr.aria-label]="pickerView() === 'year' ? 'Show months' : 'Choose year'"
              class="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-3 text-sm font-extrabold text-black hover:bg-secondary/10"
              (click)="toggleYearPicker()"
            >
              <span>{{ headerLabel() }}</span>
              <ui-icon
                [name]="pickerView() === 'year' ? 'expand_less' : 'expand_more'"
                class="text-base"
              />
            </button>

            <button
              brnButton
              type="button"
              [attr.aria-label]="pickerView() === 'year' ? 'Next years' : 'Next year'"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-secondary/10 hover:text-primary"
              (click)="shiftHeader(1)"
            >
              <ui-icon name="chevron_right" class="text-lg" />
            </button>
          </div>

          @if (pickerView() === 'year') {
            <div class="mt-3 grid grid-cols-3 gap-1.5">
              @for (year of yearOptions(); track year) {
                <button
                  brnButton
                  type="button"
                  class="h-9 cursor-pointer rounded-lg text-sm font-semibold text-gray-600 transition-colors hover:bg-secondary/10 hover:text-primary"
                  [class.bg-primary]="isSelectedYear(year)"
                  [class.text-white]="isSelectedYear(year)"
                  [class.hover:bg-primary]="isSelectedYear(year)"
                  [class.hover:text-white]="isSelectedYear(year)"
                  (click)="selectYear(year)"
                >
                  {{ year }}
                </button>
              }
            </div>
          } @else {
            <div class="mt-3 grid grid-cols-3 gap-1.5">
              @for (month of months; track month.value) {
                <button
                  brnButton
                  type="button"
                  class="h-9 cursor-pointer rounded-lg text-sm font-semibold text-gray-600 transition-colors hover:bg-secondary/10 hover:text-primary"
                  [class.bg-primary]="isSelectedMonth(month.value)"
                  [class.text-white]="isSelectedMonth(month.value)"
                  [class.hover:bg-primary]="isSelectedMonth(month.value)"
                  [class.hover:text-white]="isSelectedMonth(month.value)"
                  (click)="selectMonth(month.value, datePopover)"
                >
                  {{ month.shortLabel }}
                </button>
              }
            </div>
          }
        </div>
      </ng-template>
    </brn-popover>
  `,
})
export class UiDateSelector {
  readonly value = model<string>('');

  protected readonly months = MONTHS;
  protected readonly pickerView = signal<PickerView>('month');
  protected readonly pickerYear = signal(new Date().getFullYear());
  protected readonly yearRangeStart = signal(getYearRangeStart(new Date().getFullYear()));

  protected readonly selectedDate = computed(() => parseYearMonth(this.value()));

  protected readonly yearOptions = computed(() =>
    Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => this.yearRangeStart() + index),
  );

  protected readonly headerLabel = computed(() => {
    if (this.pickerView() === 'month') {
      return String(this.pickerYear());
    }

    const years = this.yearOptions();
    return `${years[0]} - ${years[years.length - 1]}`;
  });

  protected readonly displayValue = computed(() => {
    const selected = this.selectedDate();

    if (!selected) {
      return 'Select date';
    }

    return `${MONTHS[selected.month].label} ${selected.year}`;
  });

  protected syncPickerYear(): void {
    const year = this.selectedDate()?.year ?? new Date().getFullYear();
    this.pickerYear.set(year);
    this.yearRangeStart.set(getYearRangeStart(year));
    this.pickerView.set('month');
  }

  protected shiftHeader(delta: number): void {
    if (this.pickerView() === 'year') {
      this.yearRangeStart.update((year) => year + delta * YEAR_PAGE_SIZE);
      return;
    }

    this.pickerYear.update((year) => year + delta);
  }

  protected toggleYearPicker(): void {
    if (this.pickerView() === 'year') {
      this.pickerView.set('month');
      return;
    }

    this.yearRangeStart.set(getYearRangeStart(this.pickerYear()));
    this.pickerView.set('year');
  }

  protected isSelectedYear(year: number): boolean {
    return this.selectedDate()?.year === year;
  }

  protected selectYear(year: number): void {
    const selected = this.selectedDate();
    this.pickerYear.set(year);

    if (selected) {
      this.value.set(formatYearMonth(year, selected.month));
    }

    this.pickerView.set('month');
  }

  protected isSelectedMonth(month: number): boolean {
    const selected = this.selectedDate();
    return selected?.year === this.pickerYear() && selected.month === month;
  }

  protected selectMonth(month: number, popover: BrnPopover): void {
    this.value.set(formatYearMonth(this.pickerYear(), month));
    popover.close();
  }
}
