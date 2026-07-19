import { ChangeDetectionStrategy, Component, effect, inject, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { UiButton, UiFormFeedback, UiIcon, UiInput, UiLabel } from '../ui';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!pw && !confirm) return null;
  return pw === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-account-profile-modal',
  imports: [ReactiveFormsModule, UiButton, UiFormFeedback, UiIcon, UiInput, UiLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      (click)="closed.emit()"
    >
      <div
        class="animate-rise flex max-h-[90vh] w-full max-w-lg cursor-default flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <div class="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h3 class="text-lg font-bold text-gray-900">My Account</h3>
            <p class="mt-0.5 text-xs text-gray-500">
              {{ user()?.username }} · {{ user()?.role }}
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

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div class="flex flex-col gap-1.5">
            <label uiLabel for="fullname">Full name</label>
            <input uiInput id="fullname" type="text" formControlName="fullname" autocomplete="name" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label uiLabel for="email">Email</label>
            <input uiInput id="email" type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.touched && form.controls.email.hasError('email')) {
              <ui-form-feedback>Enter a valid email address</ui-form-feedback>
            }
          </div>

          <div class="rounded-xl border border-gray-200 p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Change password (optional)</p>
            <div class="mt-3 flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <label uiLabel for="currentPassword">Current password</label>
                <input
                  uiInput
                  id="currentPassword"
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label uiLabel for="newPassword">New password</label>
                <input
                  uiInput
                  id="newPassword"
                  type="password"
                  formControlName="newPassword"
                  autocomplete="new-password"
                />
                @if (form.controls.newPassword.touched && form.controls.newPassword.hasError('minlength')) {
                  <ui-form-feedback>Password must be at least 6 characters</ui-form-feedback>
                }
              </div>
              <div class="flex flex-col gap-1.5">
                <label uiLabel for="confirmPassword">Confirm new password</label>
                <input
                  uiInput
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                />
                @if (form.touched && form.hasError('mismatch')) {
                  <ui-form-feedback>Passwords do not match</ui-form-feedback>
                }
              </div>
            </div>
          </div>

          @if (error()) {
            <p class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {{ error() }}
            </p>
          }
          @if (success()) {
            <p class="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Profile updated successfully.
            </p>
          }

          <div class="flex items-center justify-end gap-2">
            <button type="button" uiButton variant="secondary" (click)="closed.emit()">Cancel</button>
            <button type="submit" uiButton [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AccountProfileModal {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly closed = output<void>();

  protected readonly user = this.auth.user;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      fullname: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    effect(() => {
      const u = this.user();
      if (!u) return;
      this.form.patchValue({
        fullname: u.fullname ?? '',
        email: u.email ?? '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    });
  }

  protected submit(): void {
    this.success.set(false);
    const { fullname, email, currentPassword, newPassword, confirmPassword } = this.form.getRawValue();

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        this.error.set('Current password is required to set a new password');
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        this.error.set('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        this.error.set('Passwords do not match');
        return;
      }
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete all required fields');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.auth
      .updateProfile({
        fullname,
        email,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res?.success) {
            this.success.set(true);
            this.form.patchValue({ currentPassword: '', newPassword: '', confirmPassword: '' });
          } else {
            this.error.set(res?.message ?? 'Failed to update profile');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Unable to reach the server');
        },
      });
  }
}
