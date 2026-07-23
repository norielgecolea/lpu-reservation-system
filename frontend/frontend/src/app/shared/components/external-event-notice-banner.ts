import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiIcon } from '../ui';
import {
  EXTERNAL_EVENT_PAYMENT_MESSAGE,
  FACILITIES_OFFICE_EMAIL,
} from '../constants/external-event-notice';

@Component({
  selector: 'app-external-event-notice-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiIcon],
  template: `
    <div
      class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="note"
    >
      <ui-icon name="info" class="mt-0.5 shrink-0 text-base text-amber-700" />
      <div class="flex flex-col gap-1">
        <p class="font-semibold">External Event Payment</p>
        <p class="leading-relaxed">
          {{ paymentMessage }}
          Contact
          <a
            [href]="'mailto:' + facilitiesEmail"
            class="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
          >{{ facilitiesEmail }}</a>.
        </p>
      </div>
    </div>
  `,
})
export class ExternalEventNoticeBanner {
  protected readonly paymentMessage = EXTERNAL_EVENT_PAYMENT_MESSAGE;
  protected readonly facilitiesEmail = FACILITIES_OFFICE_EMAIL;
}
