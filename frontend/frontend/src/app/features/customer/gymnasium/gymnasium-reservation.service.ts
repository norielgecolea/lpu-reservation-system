import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  GymApprovedEventsResponse,
  GymEquipmentResponse,
  GymReservationApiResponse,
  GymReservationPayload,
} from './gymnasium-reservation.models';

@Injectable({ providedIn: 'root' })
export class GymReservationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public/gymnasium`;

  getEquipment() {
    return this.http.get<GymEquipmentResponse>(`${this.base}/equipment`);
  }

  getApprovedEvents() {
    return this.http.get<GymApprovedEventsResponse>(`${this.base}/approved-events`);
  }

  submitReservation(payload: GymReservationPayload) {
    return this.http.post<GymReservationApiResponse>(`${this.base}/reserve`, payload);
  }
}
