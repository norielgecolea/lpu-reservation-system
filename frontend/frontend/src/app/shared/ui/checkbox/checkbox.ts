import { Directive } from '@angular/core';

@Directive({
  selector: 'input[type="checkbox"][uiCheckbox]',
  host: {
    class:
      'h-4 w-4 shrink-0 cursor-pointer rounded border-gray-500 ' +
      'accent-primary transition-colors duration-200 ' +
      'hover:accent-secondary ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  },
})
export class UiCheckbox {}
