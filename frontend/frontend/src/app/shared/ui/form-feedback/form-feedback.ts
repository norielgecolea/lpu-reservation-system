import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { BrnAlertDialog, BrnAlertDialogImports } from '@spartan-ng/brain/alert-dialog';

import { UiButton } from '../button/button';
import { UiIcon } from '../icon/icon';

/**
 * Shared form feedback for admin add/edit screens.
 * - Inline strip for the transient "saving..." status (non-blocking).
 * - spartan/brain alert-dialog for errors, opened automatically while `error` is set.
 * Clear the parent's error signal in `(dismissed)` so the dialog can close.
 * Usage: <ui-form-feedback [saving]="saving()" savingText="Saving user..."
 *          [error]="error()" (dismissed)="error.set(null)" />
 */
@Component({
  selector: 'ui-form-feedback',
  imports: [BrnAlertDialogImports, UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (saving()) {
      <div
        class="mx-5 mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary sm:mx-7"
      >
        {{ savingText() }}
      </div>
    }

    <brn-alert-dialog (closed)="handleClosed()">
      <brn-alert-dialog-overlay class="bg-black/50" />
      <div
        *brnAlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-gray-50 p-6 shadow-xl"
      >
        <div class="flex items-center gap-3 text-red-700">
          <ui-icon name="error" class="text-2xl" />
          <h2 brnAlertDialogTitle class="text-lg font-black">Error</h2>
        </div>
        <p
          brnAlertDialogDescription
          class="mt-3 text-sm font-semibold text-gray-700"
        >
          {{ displayedError() }}
        </p>
        <div class="mt-5 flex justify-end">
          <button uiButton type="button" (click)="closeDialog()">OK</button>
        </div>
      </div>
    </brn-alert-dialog>
  `,
})
export class UiFormFeedback {
  readonly saving = input(false);
  readonly savingText = input('Saving changes...');
  readonly error = input<string | null>(null);
  readonly dismissed = output<void>();

  protected readonly displayedError = signal<string | null>(null);

  private readonly dialog = viewChild(BrnAlertDialog);

  protected closeDialog(): void {
    this.dialog()?.close();
  }

  protected handleClosed(): void {
    this.dismissed.emit();
    this.displayedError.set(null);
  }

  constructor() {
    effect(() => {
      const dialog = this.dialog();
      const error = this.error();
      if (error) {
        this.displayedError.set(error);
      }

      if (!dialog) {
        return;
      }

      // brn's open()/close() spin up their own effects, so run them outside
      // this reactive context to avoid NG0602.
      untracked(() => (error ? dialog.open() : dialog.close()));
    });
  }
}
