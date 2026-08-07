import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Full-screen admin add-reservation shell (same pattern as coordination/reschedule overlays). */
@Component({
  selector: 'app-admin-add-reservation-page',
  host: { class: 'contents' },
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex min-h-0 flex-col bg-gray-50">
      <ng-content />
    </div>
  `,
})
export class AdminAddReservationPage {}
