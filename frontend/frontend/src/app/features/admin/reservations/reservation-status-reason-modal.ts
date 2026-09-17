import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { UiIcon } from '../../../shared/ui';

@Component({
  selector: 'app-reservation-status-reason-modal',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      (click)="onBackdrop()"
    >
      <div
        class="animate-rise flex w-full max-w-md cursor-default flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start gap-3">
          @if (action() === 'REJECTED') {
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <ui-icon name="cancel" class="text-xl text-red-600" />
            </div>
          } @else {
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <ui-icon name="block" class="text-xl text-gray-600" />
            </div>
          }
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-bold text-gray-900">
              {{ action() === 'REJECTED' ? 'Reject' : 'Cancel' }} Reservation
            </h2>
            <p class="mt-1 text-xs text-gray-500">
              Please provide a reason for
              {{ action() === 'REJECTED' ? 'rejecting' : 'cancelling' }}
              <strong>"{{ eventTitle() }}"</strong>. This will be emailed to the requestor as remarks.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold uppercase tracking-wide text-gray-400" for="status-reason">
            Reason
          </label>
          <textarea
            id="status-reason"
            class="min-h-24 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary/55 focus:outline-none focus:ring-2 focus:ring-primary/35"
            rows="4"
            maxlength="2000"
            [value]="reason()"
            [disabled]="submitting()"
            placeholder="Enter the reason…"
            (input)="onReasonInput($event)"
          ></textarea>
          @if (error()) {
            <p class="text-xs font-medium text-red-600">{{ error() }}</p>
          }
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="submitting()"
            (click)="closed.emit()"
          >
            Back
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            [class.bg-red-600]="action() === 'REJECTED'"
            [class.hover:bg-red-700]="action() === 'REJECTED'"
            [class.bg-gray-600]="action() === 'CANCELLED'"
            [class.hover:bg-gray-700]="action() === 'CANCELLED'"
            [disabled]="submitting()"
            (click)="submit()"
          >
            @if (submitting()) {
              <ui-icon name="autorenew" class="animate-spin text-base" />
            } @else {
              {{ action() === 'REJECTED' ? 'Reject' : 'Cancel reservation' }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ReservationStatusReasonModal {
  readonly action = input.required<string>();
  readonly eventTitle = input.required<string>();
  readonly submitting = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<string>();

  protected readonly reason = signal('');
  protected readonly error = signal('');

  protected onReasonInput(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
    this.error.set('');
  }

  protected onBackdrop(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  protected submit(): void {
    if (this.submitting()) return;
    const trimmed = this.reason().trim();
    if (!trimmed) {
      this.error.set('A reason is required.');
      return;
    }
    this.confirmed.emit(trimmed);
  }
}
