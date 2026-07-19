import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Type,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { UiIcon } from '../../../shared/ui';
import { AdminAddReservationPage } from './admin-add-reservation-page';
import {
  AdminReservationService,
  adminReservationListPath,
} from './admin-reservation-path.util';

const RESERVATION_LOADERS: Record<
  AdminReservationService,
  () => Promise<Type<unknown>>
> = {
  flt: () =>
    import('../../customer/flt/flt-reservation').then((m) => m.FltReservation),
  gymnasium: () =>
    import('../../customer/gymnasium/gymnasium-reservation').then(
      (m) => m.GymnasiumReservation,
    ),
  van: () =>
    import('../../customer/van/van-reservation').then((m) => m.VanReservation),
};

/** Admin add-reservation route: shell + dynamically loaded public booking flow. */
@Component({
  selector: 'app-admin-add-reservation',
  imports: [AdminAddReservationPage, NgComponentOutlet, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-add-reservation-page>
      @if (reservationComponent(); as component) {
        <ng-container *ngComponentOutlet="component; inputs: reservationInputs()" />
      } @else {
        <div class="flex flex-1 items-center justify-center gap-3 py-20 text-gray-400">
          <ui-icon name="autorenew" class="animate-spin text-3xl" />
          <span class="text-sm">Loading scheduler...</span>
        </div>
      }
    </app-admin-add-reservation-page>
  `,
})
export class AdminAddReservation {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly service = this.route.snapshot.data[
    'service'
  ] as AdminReservationService;

  protected readonly reservationComponent = signal<Type<unknown> | null>(null);

  protected readonly listPath = computed(() =>
    adminReservationListPath(this.service, this.router.url),
  );

  protected readonly reservationInputs = computed(() => ({
    adminMode: true,
    returnPath: this.listPath(),
  }));

  constructor() {
    void RESERVATION_LOADERS[this.service]().then((component) =>
      this.reservationComponent.set(component),
    );
  }
}
