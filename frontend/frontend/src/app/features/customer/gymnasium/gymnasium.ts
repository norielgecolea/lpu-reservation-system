import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoomReservationForm } from '../room-reservation/room-reservation-form';
import { ROOM_RESERVATION_FACILITIES } from '../room-reservation/room-reservation.config';

@Component({
  selector: 'app-gymnasium-reservation',
  imports: [RoomReservationForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `<app-room-reservation-form [facility]="facility" />`,
})
export class GymnasiumReservation {
  readonly facility = ROOM_RESERVATION_FACILITIES['gymnasium'];
}
