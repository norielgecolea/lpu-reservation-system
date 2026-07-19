import { computed, Directive, input } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';

export type UiButtonVariant = 'primary' | 'secondary' | 'link';

/** Shared layout/sizing so primary + secondary buttons line up at the same height. */
const BASE =
  'inline-flex box-border items-center justify-center gap-2 rounded-lg border ' +
  'px-4 py-2.5 text-[13px] font-semibold leading-none sm:text-sm ' +
  'cursor-pointer select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<UiButtonVariant, string> = {
  primary: 'border-primary bg-primary text-white hover:border-secondary hover:bg-secondary hover:text-white',
  secondary:
    'border-primary bg-transparent text-primary hover:border-secondary hover:bg-secondary hover:text-white',
  link:
    'border-transparent bg-transparent text-primary hover:text-secondary hover:bg-transparent hover:underline underline-offset-4 shadow-none',
};

/** Button: `variant="primary"` (default) or `variant="secondary"`. Built on spartan/brain button. */
@Directive({
  selector: 'button[uiButton], a[uiButton]',
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: {
    '[class]': 'classes()',
  },
})
export class UiButton {
  readonly variant = input<UiButtonVariant>('primary');
  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.variant()]}`);
}
