import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { UiInput } from '../input/input';
import { UiIcon } from '../icon/icon';

/** Search field: leading search icon + text input. Built on the uiInput directive. */
@Component({
  selector: 'ui-input-search',
  imports: [UiInput, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block min-w-0' },
  template: `
    <ui-icon
      name="search"
      class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-lg text-gray-400"
    />
    <input
      uiInput
      type="search"
      [placeholder]="placeholder()"
      [value]="value()"
      (input)="value.set($any($event.target).value)"
      class="pl-10! h-9! py-0! [&::-webkit-search-cancel-button]:appearance-none"
    />
  `,
})
export class UiInputSearch {
  readonly placeholder = input('Search...');
  readonly value = model<string>('');
}
