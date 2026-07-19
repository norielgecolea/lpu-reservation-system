import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton, UiIcon } from '../../shared/ui';

@Component({
  selector: 'app-reservation-submitted-modal',
  imports: [RouterLink, UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        class="animate-rise w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
        role="dialog"
        aria-labelledby="reservation-submitted-title"
      >
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <ui-icon name="check_circle" class="text-5xl text-green-500" />
        </div>
        <h2 id="reservation-submitted-title" class="mt-4 text-xl font-bold text-gray-900">
          Reservation Submitted!
        </h2>
        <p class="mt-2 text-sm text-gray-500">{{ message() }}</p>
        <a [routerLink]="returnPath()" uiButton variant="primary" class="mt-6 inline-flex w-full justify-center">
          {{ returnLabel() }}
        </a>
      </div>
    </div>
  `,
})
export class ReservationSubmittedModal {
  readonly message = input.required<string>();
  readonly returnPath = input('/customer');
  readonly returnLabel = input('Back to Home');
}
