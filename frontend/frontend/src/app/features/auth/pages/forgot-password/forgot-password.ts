import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { UiButton, UiIcon, UiInput, UiLabel } from '../../../../shared/ui';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiInput, UiLabel, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex min-h-dvh w-full items-center justify-center bg-[#f6f7fb] p-4">
      <div class="animate-rise w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5">
        <div class="mb-6 flex flex-col gap-2 text-center">
          <ui-icon name="lock_reset" class="mx-auto text-4xl text-primary" />
          <h1 class="text-2xl font-black text-gray-900">Forgot Password</h1>
          <p class="text-sm text-gray-500">
            Enter the email on your account. We'll send a reset link if it matches an active user.
          </p>
        </div>

        @if (!submitted()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="email">Email address</label>
              <input uiInput id="email" type="email" formControlName="email" autocomplete="email" />
            </div>

            @if (error()) {
              <p class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{{ error() }}</p>
            }

            <button uiButton type="submit" class="w-full" [disabled]="loading()">
              {{ loading() ? 'Sending...' : 'Send reset link' }}
            </button>
          </form>
        } @else {
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {{ successMessage() }}
          </div>
        }

        <p class="mt-6 text-center text-sm">
          <a routerLink="/login" class="font-semibold text-primary hover:underline">Back to login</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly successMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.forgotPassword({ email: this.form.getRawValue().email.trim() }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.submitted.set(true);
        this.successMessage.set(res?.message ?? 'If an account exists for that email, a reset link has been sent.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }
}
