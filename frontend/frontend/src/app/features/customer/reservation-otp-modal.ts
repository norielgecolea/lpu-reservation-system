import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { UiButton, UiIcon, UiInput, UiLabel } from '../../shared/ui';
import { ReservationOtpService } from './reservation-otp.service';

@Component({
  selector: 'app-reservation-otp-modal',
  imports: [ReactiveFormsModule, UiButton, UiIcon, UiInput, UiLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        class="animate-rise w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-labelledby="reservation-otp-title"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ui-icon name="mark_email_unread" class="text-3xl text-primary" />
        </div>

        <h2 id="reservation-otp-title" class="mt-4 text-center text-xl font-bold text-gray-900">
          Verify your email
        </h2>
        <p class="mt-2 text-center text-sm text-gray-500">
          We sent a 6-digit code to
          <span class="font-semibold text-gray-700">{{ email() }}</span>.
          Enter it below to submit your reservation.
        </p>

        <div class="mt-6 flex flex-col gap-2">
          <label uiLabel for="otpCode">Verification code</label>
          <input
            uiInput
            id="otpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="000000"
            [formControl]="codeControl"
            (keydown.enter)="verify()"
          />
        </div>

        @if (error()) {
          <div class="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <ui-icon name="error_outline" class="shrink-0 text-base" />
            {{ error() }}
          </div>
        }

        @if (info()) {
          <p class="mt-3 text-center text-xs text-gray-500">{{ info() }}</p>
        }

        <div class="mt-6 flex flex-col gap-3">
          <button
            uiButton
            variant="primary"
            type="button"
            class="w-full justify-center"
            [disabled]="verifying() || codeControl.invalid"
            (click)="verify()"
          >
            @if (verifying()) {
              <ui-icon name="autorenew" class="mr-1 animate-spin" />
              VERIFYING...
            } @else {
              VERIFY &amp; SUBMIT
            }
          </button>

          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              [disabled]="sending() || resendCooldown() > 0"
              (click)="resend()"
            >
              @if (sending()) {
                Sending...
              } @else if (resendCooldown() > 0) {
                Resend in {{ resendCooldown() }}s
              } @else {
                Resend code
              }
            </button>
            <button
              type="button"
              class="text-sm font-medium text-gray-500 hover:text-gray-700"
              [disabled]="verifying() || sending()"
              (click)="cancelled.emit()"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReservationOtpModal implements OnInit, OnDestroy {
  private readonly otpService = inject(ReservationOtpService);
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  readonly email = input.required<string>();
  readonly contactPerson = input.required<string>();

  readonly verified = output<string>();
  readonly cancelled = output<void>();

  readonly codeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });

  readonly sending = signal(false);
  readonly verifying = signal(false);
  readonly error = signal('');
  readonly info = signal('');
  readonly resendCooldown = signal(0);

  ngOnInit(): void {
    this.send(true);
  }

  ngOnDestroy(): void {
    this.clearCooldown();
  }

  verify(): void {
    this.codeControl.markAsTouched();
    if (this.codeControl.invalid || this.verifying()) return;

    this.verifying.set(true);
    this.error.set('');
    this.info.set('');

    this.otpService.verifyCode(this.email(), this.codeControl.value.trim()).subscribe({
      next: (res) => {
        this.verifying.set(false);
        if (res.success && res.otpToken) {
          this.clearCooldown();
          this.verified.emit(res.otpToken);
          return;
        }
        this.error.set(res.message || 'Invalid verification code.');
      },
      error: () => {
        this.verifying.set(false);
        this.error.set('Unable to verify code. Please try again.');
      },
    });
  }

  resend(): void {
    if (this.sending() || this.resendCooldown() > 0) return;
    this.send(false);
  }

  private send(initial: boolean): void {
    this.sending.set(true);
    this.error.set('');
    if (!initial) this.info.set('');

    this.otpService.sendCode(this.email(), this.contactPerson()).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res.success) {
          this.info.set(initial ? 'Code sent. Check your inbox.' : 'A new code was sent.');
          this.startCooldown(30);
          return;
        }
        this.error.set(res.message || 'Failed to send verification code.');
      },
      error: () => {
        this.sending.set(false);
        this.error.set('Unable to send verification code. Please try again.');
      },
    });
  }

  private startCooldown(seconds: number): void {
    this.clearCooldown();
    this.resendCooldown.set(seconds);
    this.cooldownTimer = setInterval(() => {
      const next = this.resendCooldown() - 1;
      if (next <= 0) {
        this.clearCooldown();
        return;
      }
      this.resendCooldown.set(next);
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.resendCooldown.set(0);
  }
}
