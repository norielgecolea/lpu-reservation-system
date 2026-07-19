import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  VanApprovedEventsResponse,
  VanReservationApiResponse,
  VanReservationPayload,
  VanVehiclesResponse,
} from './van-reservation.models';

@Injectable({ providedIn: 'root' })
export class VanReservationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public/van`;

  getApprovedEvents() {
    return this.http.get<VanApprovedEventsResponse>(`${this.base}/approved-events`);
  }

  getVehicles() {
    return this.http.get<VanVehiclesResponse>(`${this.base}/vehicles`);
  }

  submitReservation(payload: VanReservationPayload) {
    return this.http.post<VanReservationApiResponse>(`${this.base}/reserve`, payload);
  }
}
