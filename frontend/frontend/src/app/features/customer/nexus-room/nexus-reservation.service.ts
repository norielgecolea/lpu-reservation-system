import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  NexusApprovedEventsResponse,
  NexusEquipmentResponse,
  NexusReservationApiResponse,
  NexusReservationPayload,
} from './nexus-reservation.models';

@Injectable({ providedIn: 'root' })
export class NexusReservationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public/nexus`;

  getEquipment() {
    return this.http.get<NexusEquipmentResponse>(`${this.base}/equipment`);
  }

  getApprovedEvents() {
    return this.http.get<NexusApprovedEventsResponse>(`${this.base}/approved-events`);
  }

  submitReservation(payload: NexusReservationPayload) {
    return this.http.post<NexusReservationApiResponse>(`${this.base}/reserve`, payload);
  }
}
