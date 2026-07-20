import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { BrnToggleGroupImports } from '@spartan-ng/brain/toggle-group';

export interface UiSegmentedOption {
  value: string;
  label?: string;
  /** Soft badge text, e.g. "Soon". */
  badge?: string;
  disabled?: boolean;
}

type SegmentedInput = string | UiSegmentedOption;

/** Segmented control built on spartan/brain toggle-group. Single-select, active = primary, hover = secondary. */
@Component({
  selector: 'ui-segmented',
  imports: [BrnToggleGroupImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block max-w-full overflow-x-auto sm:inline-block',
  },
  template: `
    <brn-toggle-group
      class="border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] flex min-w-full h-10 items-center gap-1 rounded-lg p-0.5 sm:min-w-0"
      [value]="value()"
      (valueChange)="onValueChange($any($event))"
    >
      @for (o of normalizedOptions(); track o.value) {
        <button
          brnToggleGroupItem
          [value]="o.value"
          [disabled]="o.disabled"
          class="flex h-full cursor-pointer items-center gap-1 rounded-md px-2.5 text-sm font-bold leading-none text-gray-600 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] data-[state=off]:hover:bg-secondary data-[state=off]:hover:text-white data-[state=on]:bg-primary data-[state=on]:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-gray-600 sm:px-3"
        >
          <span class="whitespace-nowrap">{{ o.label }}</span>
          @if (o.badge) {
            <span
              class="rounded bg-amber-100 px-1 py-px text-[9px] font-extrabold uppercase tracking-wide text-amber-700 data-[state=on]:bg-white/20 data-[state=on]:text-white"
            >
              {{ o.badge }}
            </span>
          }
        </button>
      }
    </brn-toggle-group>
  `,
})
export class UiSegmented {
  readonly options = input<SegmentedInput[]>([]);
  readonly value = model<string>('');

  protected readonly normalizedOptions = computed(() =>
    this.options().map((o): Required<UiSegmentedOption> => {
      if (typeof o === 'string') {
        return { value: o, label: o, badge: '', disabled: false };
      }
      return {
        value: o.value,
        label: o.label ?? o.value,
        badge: o.badge ?? '',
        disabled: !!o.disabled,
      };
    }),
  );

  protected onValueChange(next: string): void {
    if (!next) return;
    const opt = this.normalizedOptions().find((o) => o.value === next);
    if (opt?.disabled) return;
    this.value.set(next);
  }
}
