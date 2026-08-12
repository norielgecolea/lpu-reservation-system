import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { UiIcon } from '../ui';
import { ReservationAlertService } from '../../features/admin/reservations/reservation-alert.service';

const AUTO_DISMISS_MS = 8000;

const FACILITY_PATH: Record<string, string> = {
  FLT: 'reservation/flt',
  GYMNASIUM: 'reservation/gymnasium',
  VAN: 'reservation/van',
  NEXUS: 'reservation/nexus',
};

@Component({
  selector: 'app-reservation-alert-balloon',
  imports: [UiIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (alerts.alert(); as alert) {
      <div
        class="pointer-events-none fixed top-4 right-4 z-[80] flex w-[min(100vw-2rem,22rem)] justify-end"
        role="status"
        aria-live="polite"
      >
        <div
          class="pointer-events-auto animate-rise flex w-full items-start gap-3 rounded-2xl border border-amber-200/80 bg-white px-4 py-3 shadow-xl shadow-amber-900/10 ring-1 ring-black/5"
        >
          <div
            class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
          >
            <ui-icon name="notifications_active" class="text-xl" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-gray-900">New reservation</p>
            <p class="mt-0.5 text-sm text-gray-600">{{ alert.message }}</p>
            <a
              [routerLink]="routeFor(alert.facility)"
              class="mt-2 inline-flex text-xs font-semibold text-amber-800 hover:underline"
              (click)="alerts.dismiss()"
            >
              Open approver
            </a>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
            aria-label="Dismiss notification"
            (click)="alerts.dismiss()"
          >
            <ui-icon name="close" class="text-lg" />
          </button>
        </div>
      </div>
    }
  `,
})
export class ReservationAlertBalloon {
  protected readonly alerts = inject(ReservationAlertService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const alert = this.alerts.alert();
      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
      }
      if (!alert) return;
      this.dismissTimer = setTimeout(() => {
        if (this.alerts.alert()?.id === alert.id) {
          this.alerts.dismiss();
        }
      }, AUTO_DISMISS_MS);
    });

    this.destroyRef.onDestroy(() => {
      if (this.dismissTimer) clearTimeout(this.dismissTimer);
    });
  }

  protected routeFor(facility: string): string {
    const path = FACILITY_PATH[facility] ?? 'dashboard';
    if (this.router.url.startsWith('/facilities')) return `/facilities/${path}`;
    if (this.router.url.startsWith('/flt-tech')) {
      return facility === 'FLT' ? '/flt-tech/reservation/flt' : '/flt-tech/dashboard';
    }
    return `/${path}`;
  }
}
