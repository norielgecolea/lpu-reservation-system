import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { UiIcon } from '../icon/icon';

@Component({
  selector: 'ui-toast',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div
        class="animate-rise fixed bottom-5 left-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg sm:left-auto sm:min-w-[320px]"
        [class.bg-green-600]="success()"
        [class.bg-red-600]="!success()"
      >
        <ui-icon [name]="success() ? 'check_circle' : 'error'" class="text-xl" />

        <div>
          <p class="font-semibold">
            {{ success() ? 'Success' : 'Error' }}
          </p>
          <p class="text-sm">
            {{ message() }}
          </p>
        </div>
      </div>
    }
  `,
})
export class UiToast {
  readonly show = input(false);
  readonly success = input(false);
  readonly message = input('');
}
