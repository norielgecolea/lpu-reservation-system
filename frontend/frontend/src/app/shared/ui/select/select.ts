import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnPopover, BrnPopoverImports } from '@spartan-ng/brain/popover';

import { UiIcon } from '../icon/icon';
import { UiInput } from '../input/input';

export interface UiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Dropdown styled to match uiInput. Built on spartan/brain button + popover.
 * Works with reactive forms via formControlName / ngModel, or direct [value] binding.
 * Usage: <ui-select formControlName="role" placeholder="Select a role" [options]="roles" />
 */
@Component({
  selector: 'ui-select',
  imports: [BrnButtonImports, BrnPopoverImports, UiIcon, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSelect), multi: true }],
  template: `
    <brn-popover #selectPopover="brnPopover" sideOffset="6" align="start" closeOnOutsidePointerEvents>
      <button
        brnButton
        brnPopoverTrigger
        type="button"
        [disabled]="disabled()"
        (click)="resetSearch()"
        class="relative h-9 w-full cursor-pointer rounded-lg border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] px-3 py-0 pr-9 text-left text-[13px] text-gray-900 transition-all duration-200 hover:border-secondary/45 hover:ring-secondary/25 focus:border-primary/55 focus:ring-2 focus:ring-primary/35 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-expanded:border-primary/55 aria-expanded:ring-2 aria-expanded:ring-primary/35 sm:text-sm"
      >
        <span
          class="block truncate"
          [class.text-gray-400]="!selectedLabel()"
        >
          {{ selectedLabel() || placeholder() }}
        </span>
        <ui-icon
          name="expand_more"
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-gray-500"
        />
      </button>

      <ng-template brnPopoverContent>
        <div
          class="z-50 min-w-[var(--brn-popover-trigger-width)] overflow-hidden rounded-lg border border-zinc-950/15 bg-white/90 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_-18px_rgba(24,24,27,0.36)]"
        >
          @if (searchable()) {
            <div class="border-b border-zinc-950/10 p-2">
              <div class="relative">
                <ui-icon
                  name="search"
                  class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-lg text-gray-400"
                />
                <input
                  uiInput
                  type="search"
                  placeholder="Search..."
                  [value]="searchQuery()"
                  (input)="onSearchInput($event)"
                  (click)="$event.stopPropagation()"
                  (keydown)="$event.stopPropagation()"
                  class="h-9! py-0! pl-10! [&::-webkit-search-cancel-button]:appearance-none"
                />
              </div>
            </div>
          }

          <div class="max-h-60 overflow-y-auto p-1">
            @for (opt of visibleOptions(); track opt.value) {
              <button
                brnButton
                type="button"
                [disabled]="!!opt.disabled"
                class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] text-gray-700 transition-colors duration-150 hover:bg-secondary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-gray-700 sm:text-sm"
                [class.font-semibold]="value() === opt.value"
                [class.text-primary]="value() === opt.value"
                (click)="!opt.disabled && selectOption(opt.value, selectPopover)"
              >
                <span class="truncate">{{ opt.label }}</span>
                @if (value() === opt.value) {
                  <ui-icon name="check" class="shrink-0 text-base text-primary" />
                }
              </button>
            } @empty {
              <p class="px-3 py-4 text-center text-xs text-gray-500">No options found</p>
            }
          </div>
        </div>
      </ng-template>
    </brn-popover>
  `,
})
export class UiSelect implements ControlValueAccessor {
  readonly options = input<readonly UiSelectOption[]>([]);
  readonly placeholder = input('Select an option');
  readonly searchable = input(false);
  readonly value = model<string | null>(null);

  protected readonly disabled = signal(false);
  protected readonly searchQuery = signal('');

  protected readonly visibleOptions = computed(() => {
    const opts = this.options();
    if (!this.searchable()) return opts;
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return opts;
    return opts.filter(
      opt =>
        opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query),
    );
  });

  protected readonly selectedLabel = computed(() => {
    const current = this.value();
    return this.options().find(opt => opt.value === current)?.label ?? null;
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value || null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected resetSearch(): void {
    this.searchQuery.set('');
  }

  protected selectOption(value: string, popover: BrnPopover): void {
    this.select(value);
    this.resetSearch();
    popover.close();
  }

  protected select(value: string | null | undefined): void {
    const next = value ?? null;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }
}
