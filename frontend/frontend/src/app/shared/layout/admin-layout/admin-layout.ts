import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ReservationAlertService } from '../../../features/admin/reservations/reservation-alert.service';
import { ReservationAlertBalloon } from '../reservation-alert-balloon';
import { SideNav } from '../side-nav/side-nav';

/** Persistent admin chrome: side nav stays mounted while child routes change. */
@Component({
  selector: 'app-admin-layout',
  imports: [SideNav, RouterOutlet, ReservationAlertBalloon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-transparent text-black lg:flex-row"
    >
      <app-side-nav />
      <main
        class="admin-layout-main flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:pt-6 sm:pb-6"
        style="scrollbar-width: thin"
      >
        <router-outlet />
      </main>
      <app-reservation-alert-balloon />
    </div>
  `,
})
export class AdminLayout {
  private readonly alerts = inject(ReservationAlertService);

  /** First click/key unlocks AudioContext + prompts browser notification permission. */
  @HostListener('document:pointerdown')
  @HostListener('document:keydown')
  onUserGesture(): void {
    this.alerts.unlockAudio();
  }
}
