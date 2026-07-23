import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton, UiIcon } from '../ui';
import {
  EXTERNAL_EVENT_PAYMENT_MESSAGE,
  FACILITIES_OFFICE_EMAIL,
} from '../constants/external-event-notice';

@Component({
  selector: 'app-external-event-notice-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiButton, UiIcon],
  host: {
    class: 'flex flex-col min-h-screen bg-gray-50',
  },
  template: `
    <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg shrink-0">
      <div class="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        @if (showLogo()) {
          <img src="/logo.svg" alt="LPU Logo" class="w-10 h-10 shrink-0 object-contain drop-shadow" />
        }
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-black tracking-tight leading-tight">{{ facilityTitle() }}</h1>
          <p class="text-white/60 text-xs">External Event Information</p>
        </div>
        <button
          type="button"
          (click)="back.emit()"
          class="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <ui-icon name="arrow_back" class="text-base" />
          Back
        </button>
      </div>
    </div>

    <div class="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-6 py-8">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 flex flex-col gap-8">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ui-icon name="info" class="text-4xl" />
          </div>
          <div class="flex flex-col gap-2">
            <h2 class="text-2xl font-black text-gray-900">After Booking</h2>
            <p class="text-sm text-gray-500 leading-relaxed max-w-2xl">
              Please review this information before completing your {{ facilityTitle() }} reservation form.
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <ui-icon name="info" class="mt-0.5 shrink-0 text-xl text-amber-700" />
            <div class="flex flex-col gap-2 text-sm text-amber-950">
              <p class="text-base font-bold">External Event Payments</p>
              <p class="leading-relaxed">
                {{ paymentMessage }}
                Please contact
                <a
                  [href]="'mailto:' + facilitiesEmail"
                  class="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >{{ facilitiesEmail }}</a>.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button uiButton variant="secondary" type="button" class="w-full sm:w-auto" (click)="back.emit()">
            Back to Date Selection
          </button>
          <button uiButton type="button" class="w-full sm:w-auto" (click)="continued.emit()">
            Continue to Form
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ExternalEventNoticeStep {
  readonly facilityTitle = input.required<string>();
  readonly showLogo = input(true);

  readonly back = output<void>();
  readonly continued = output<void>();

  protected readonly paymentMessage = EXTERNAL_EVENT_PAYMENT_MESSAGE;
  protected readonly facilitiesEmail = FACILITIES_OFFICE_EMAIL;
}
