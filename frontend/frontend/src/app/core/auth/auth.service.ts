import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest, UpdateProfileRequest, ForgotPasswordRequest, ResetPasswordWithTokenRequest } from './auth.models';

const TOKEN_KEY = 'lpul_token';
const USERNAME_KEY = 'lpul_remember_username';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly base = environment.apiUrl;

  readonly token = signal<string | null>(this.readToken());
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.token() !== null);

  login(payload: LoginRequest, remember = true) {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/login`, payload)
      .pipe(tap((res) => res.success && this.setSession(res, remember)));
  }

  /** Validate the stored token and refresh the current user. */
  me() {
    return this.http
      .get<AuthResponse>(`${this.base}/auth/me`)
      .pipe(tap((res) => this.user.set(toUser(res))));
  }

  updateProfile(payload: UpdateProfileRequest) {
    return this.http
      .put<AuthResponse>(`${this.base}/auth/profile`, payload)
      .pipe(tap((res) => res.success && this.applyUserUpdate(res)));
  }

  forgotPassword(payload: ForgotPasswordRequest) {
    return this.http.post<AuthResponse>(`${this.base}/auth/forgot-password`, payload);
  }

  resetPasswordWithToken(payload: ResetPasswordWithTokenRequest) {
    return this.http.post<AuthResponse>(`${this.base}/auth/reset-password`, payload);
  }

  logout() {
    this.token.set(null);
    this.user.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  rememberedUsername(): string | null {
    return this.isBrowser ? localStorage.getItem(USERNAME_KEY) : null;
  }

  private setSession(res: AuthResponse, remember: boolean) {
    this.token.set(res.token);
    this.user.set(toUser(res));
    if (!this.isBrowser) return;

    if (remember) {
      localStorage.setItem(TOKEN_KEY, res.token);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(USERNAME_KEY, res.username);
    } else {
      sessionStorage.setItem(TOKEN_KEY, res.token);
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private applyUserUpdate(res: AuthResponse) {
    this.user.set(toUser(res));
  }

  private readToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }
}

function toUser(res: AuthResponse): AuthUser {
  return {
    username: res.username,
    role: res.role,
    email: res.email,
    fullname: res.fullname,
    empId: res.empId,
  };
}
