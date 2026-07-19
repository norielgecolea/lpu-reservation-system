import { Directive } from '@angular/core';
import { BrnInput } from '@spartan-ng/brain/input';

/** Text input. Built on spartan/brain input (field + validation state). */
@Directive({
  selector: 'input[uiInput]',
  hostDirectives: [BrnInput],
  host: {
    class:
      'w-full rounded-lg border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] px-4 py-2 text-sm sm:px-3.5 sm:py-2.5 sm:text-sm ' +
      'text-gray-900 placeholder:text-gray-500 ' +
      'transition-all duration-200 hover:border-secondary/45 hover:ring-secondary/25 ' +
      'focus:border-primary/55 focus:ring-2 focus:ring-primary/35 focus:outline-none',
  },
})
export class UiInput {}
