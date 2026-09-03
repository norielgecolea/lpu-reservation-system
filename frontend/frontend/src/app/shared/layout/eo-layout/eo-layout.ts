import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { homePathForRole, isEoAdmin } from '../../../core/auth/roles';
import { UiButton, UiIcon } from '../../ui';

@Component({
  selector: 'app-eo-layout',
  imports: [RouterOutlet, RouterLink, UiIcon, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-transparent text-black">
      <header
        class="shrink-0 bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg"
      >
        <div class="flex items-center gap-3 px-4 py-3 sm:px-6">
          <img
            src="/logo.svg"
            alt="LPU Laguna"
            width="48"
            height="48"
            class="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-black uppercase tracking-wide sm:text-base">LPU Laguna</p>
            <p class="truncate text-[11px] text-white/70 sm:text-xs">Executive Office</p>
          </div>
          <div class="hidden min-w-0 flex-col items-end text-right sm:flex">
            <p class="text-sm font-semibold tabular-nums">{{ clockTime() }}</p>
            <p class="text-[11px] text-white/70">{{ clockDate() }}</p>
          </div>
          @if (showBack()) {
            <a
              [routerLink]="backHref()"
              uiButton
              variant="secondary"
              class="hidden !border-white/40 !bg-white/10 !text-white hover:!bg-white/20 sm:inline-flex"
            >
              <ui-icon name="arrow_back" class="text-base" />
              Back
            </a>
          }
          <button
            type="button"
            (click)="logout()"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90"
          >
            <ui-icon name="logout" class="text-base" />
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
        <div class="border-t border-white/10 px-4 py-1.5 text-center text-[11px] text-white/80 sm:hidden">
          {{ clockDate() }} · {{ clockTime() }}
        </div>
      </header>
      <main class="flex min-h-0 flex-1 flex-col overflow-y-auto" style="scrollbar-width: thin">
        <router-outlet />
      </main>
    </div>
  `,
})
export class EoLayout implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private clockHandle?: ReturnType<typeof setInterval>;

  protected readonly clockTime = signal('');
  protected readonly clockDate = signal('');
  protected readonly showBack = computed(() => !isEoAdmin(this.auth.user()?.role));
  protected readonly backHref = computed(() => {
    const user = this.auth.user();
    return homePathForRole(user?.role, user?.homePath);
  });

  ngOnInit(): void {
    this.tickClock();
    if (!this.isBrowser) return;
    this.clockHandle = setInterval(() => this.tickClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockHandle) clearInterval(this.clockHandle);
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private tickClock(): void {
    const now = new Date();
    this.clockTime.set(
      now.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
    this.clockDate.set(
      now.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    );
  }
}
