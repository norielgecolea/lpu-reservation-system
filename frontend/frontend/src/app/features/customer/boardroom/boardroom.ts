import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoomReservationForm } from '../room-reservation/room-reservation-form';
import { ROOM_RESERVATION_FACILITIES } from '../room-reservation/room-reservation.config';

@Component({
  selector: 'app-boardroom-reservation',
  imports: [RoomReservationForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `<app-room-reservation-form [facility]="facility" />`,
})
export class BoardroomReservation {
  readonly facility = ROOM_RESERVATION_FACILITIES['boardroom'];
}
