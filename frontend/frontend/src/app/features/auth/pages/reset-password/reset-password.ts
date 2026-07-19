import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { UiButton, UiIcon, UiInput, UiLabel } from '../../../../shared/ui';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiInput, UiLabel, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex min-h-dvh w-full items-center justify-center bg-[#f6f7fb] p-4">
      <div class="animate-rise w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5">
        <div class="mb-6 flex flex-col gap-2 text-center">
          <ui-icon name="vpn_key" class="mx-auto text-4xl text-primary" />
          <h1 class="text-2xl font-black text-gray-900">Set New Password</h1>
          <p class="text-sm text-gray-500">Choose a new password for your account.</p>
        </div>

        @if (!token()) {
          <p class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            Invalid reset link. Request a new one from the login page.
          </p>
        } @else if (!completed()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="newPassword">New password</label>
              <input uiInput id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="confirmPassword">Confirm password</label>
              <input uiInput id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" />
            </div>

            @if (error()) {
              <p class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{{ error() }}</p>
            }

            <button uiButton type="submit" class="w-full" [disabled]="loading()">
              {{ loading() ? 'Saving...' : 'Update password' }}
            </button>
          </form>
        } @else {
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Password updated successfully.
          </div>
          <button uiButton type="button" class="mt-4 w-full" (click)="goLogin()">Go to login</button>
        }

        <p class="mt-6 text-center text-sm">
          <a routerLink="/login" class="font-semibold text-primary hover:underline">Back to login</a>
        </p>
      </div>
    </div>
  `,
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly token = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly completed = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t?.trim() || null);
  }

  protected submit(): void {
    const token = this.token();
    if (!token) return;

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPasswordWithToken({ token, newPassword }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) {
          this.completed.set(true);
        } else {
          this.error.set(res?.message ?? 'Failed to reset password');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected goLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
