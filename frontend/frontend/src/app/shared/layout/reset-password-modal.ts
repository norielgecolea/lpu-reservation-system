import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { UiButton, UiFormFeedback, UiIcon, UiInput, UiLabel } from '../ui';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password-modal',
  imports: [ReactiveFormsModule, UiButton, UiFormFeedback, UiIcon, UiInput, UiLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      (click)="closed.emit()"
    >
      <div
        class="animate-rise w-full max-w-md cursor-default rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Reset Password</h3>
            <p class="mt-0.5 text-xs text-gray-500">
              {{ username() }} ({{ employeeId() }})
            </p>
          </div>
          <button
            type="button"
            class="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100"
            (click)="closed.emit()"
          >
            <ui-icon name="close" class="text-xl" />
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4 p-5">
          <div class="flex flex-col gap-1.5">
            <label uiLabel for="newPassword">New password</label>
            <input
              uiInput
              id="newPassword"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="newPassword"
              autocomplete="new-password"
            />
            @if (form.controls.newPassword.touched && form.controls.newPassword.hasError('minlength')) {
              <ui-form-feedback>Password must be at least 6 characters</ui-form-feedback>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label uiLabel for="confirmPassword">Confirm password</label>
            <input
              uiInput
              id="confirmPassword"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
            />
            @if (form.touched && form.hasError('mismatch')) {
              <ui-form-feedback>Passwords do not match</ui-form-feedback>
            }
          </div>

          @if (error()) {
            <p class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {{ error() }}
            </p>
          }

          <div class="flex items-center justify-end gap-2">
            <button type="button" uiButton variant="secondary" (click)="closed.emit()">Cancel</button>
            <button type="submit" uiButton [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Reset password' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ResetPasswordModal {
  private readonly fb = inject(FormBuilder);

  readonly employeeId = input.required<string>();
  readonly username = input.required<string>();
  readonly closed = output<void>();
  readonly confirmed = output<string>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.form.errors?.['mismatch'] ? 'Passwords do not match' : 'Please complete all fields');
      return;
    }

    this.error.set(null);
    this.confirmed.emit(this.form.controls.newPassword.value);
  }

  setSaving(value: boolean): void {
    this.saving.set(value);
  }

  setError(message: string | null): void {
    this.error.set(message);
  }
}
