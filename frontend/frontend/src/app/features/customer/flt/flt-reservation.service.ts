import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  FltApprovedEventsResponse,
  FltEquipmentResponse,
  FltOccupiedDatesResponse,
  FltReservationApiResponse,
  FltReservationPayload,
} from './flt-reservation.models';

@Injectable({ providedIn: 'root' })
export class FltReservationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public/flt`;

  getEquipment() {
    return this.http.get<FltEquipmentResponse>(`${this.base}/equipment`);
  }

  getOccupiedDates() {
    return this.http.get<FltOccupiedDatesResponse>(`${this.base}/occupied-dates`);
  }

  getApprovedEvents() {
    return this.http.get<FltApprovedEventsResponse>(`${this.base}/approved-events`);
  }

  submitReservation(payload: FltReservationPayload) {
    return this.http.post<FltReservationApiResponse>(`${this.base}/reserve`, payload);
  }
}
