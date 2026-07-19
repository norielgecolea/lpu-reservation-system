import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Admin add-reservation shell: content grows naturally; admin main scrolls. */
@Component({
  selector: 'app-admin-add-reservation-page',
  host: { class: 'block' },
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-black/5">
      <ng-content />
    </div>
  `,
})
export class AdminAddReservationPage {}
