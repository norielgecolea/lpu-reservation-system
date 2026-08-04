import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { homePathForRole } from '../../../../core/auth/roles';
import { UiButton, UiCheckbox, UiIcon, UiInput, UiLabel } from '../../../../shared/ui';
import { environment } from '../../../../../environments/environment';

type BackendStatus = 'checking' | 'online' | 'offline';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, UiButton, UiInput, UiCheckbox, UiLabel, UiIcon, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private imageInterval: ReturnType<typeof setInterval> | null = null;
  private backendStatusInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly forgotOpen = signal(false);
  protected readonly forgotLoading = signal(false);
  protected readonly forgotError = signal<string | null>(null);
  protected readonly forgotSuccess = signal<string | null>(null);
  protected readonly backendStatus = signal<BackendStatus>('checking');
  protected readonly activeImage = signal(0);
  protected readonly heroImages = [
    { src: '/lpu-building.webp', alt: 'LPU Laguna campus' },
    { src: '/background.webp', alt: 'LPU Laguna building' },
  ];

  constructor() {
    if (this.isBrowser) {
      this.imageInterval = setInterval(() => {
        this.activeImage.update((index) => (index + 1) % this.heroImages.length);
      }, 8000);
      this.checkBackendStatus();
      this.backendStatusInterval = setInterval(() => this.checkBackendStatus(), 15000);
    }
  }

  ngOnDestroy(): void {
    if (this.imageInterval) {
      clearInterval(this.imageInterval);
    }
    if (this.backendStatusInterval) {
      clearInterval(this.backendStatusInterval);
    }
  }

  protected readonly form = this.fb.nonNullable.group({
    username: [this.auth.rememberedUsername() ?? '', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [this.auth.rememberMePreferred()],
  });

  protected readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected backendStatusLabel(): string {
    switch (this.backendStatus()) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      default:
        return 'Checking';
    }
  }

  private checkBackendStatus(): void {
    this.http
      .get(`${environment.apiUrl}/health`, {
        observe: 'response',
        responseType: 'json',
      })
      .subscribe({
        next: () => this.backendStatus.set('online'),
        error: (err) => {
          const status = Number(err?.status ?? 0);
          this.backendStatus.set(status === 0 || status >= 500 ? 'offline' : 'online');
        },
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password, remember } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.auth.login({ username, password }, remember).subscribe({
      next: (res) => {
        this.loading.set(false);

        if (!res?.success) {
          this.error.set(res?.message ?? 'Login failed');
          return;
        }

        const home = homePathForRole(res.role, res.homePath);
        if (home === '/login') {
          this.error.set(`Unknown role: ${res.role}`);
          return;
        }
        this.router.navigateByUrl(home);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected openForgotPassword(): void {
    this.forgotOpen.set(true);
    this.forgotError.set(null);
    this.forgotSuccess.set(null);
  }

  protected closeForgotPassword(): void {
    this.forgotOpen.set(false);
    this.forgotLoading.set(false);
  }

  protected submitForgotPassword(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.forgotLoading.set(true);
    this.forgotError.set(null);
    this.forgotSuccess.set(null);
    this.auth.forgotPassword({ email: this.forgotForm.getRawValue().email.trim() }).subscribe({
      next: (res) => {
        this.forgotLoading.set(false);
        this.forgotSuccess.set(
          res?.message ?? 'If an account exists for that email, a reset link has been sent.',
        );
      },
      error: (err) => {
        this.forgotLoading.set(false);
        this.forgotError.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }
}
