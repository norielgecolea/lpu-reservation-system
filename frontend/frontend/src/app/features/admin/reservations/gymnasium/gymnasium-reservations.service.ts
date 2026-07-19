import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  GymAdminActionResponse,
  GymAdminListResponse,
  ReservationStatus,
  RescheduleRequest,
  ReservedDateSlot,
  SetCoordinationRequest,
} from './gymnasium-reservations.models';

@Injectable({ providedIn: 'root' })
export class GymReservationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/gymnasium`;

  getAll(month?: string) {
    const params = month?.trim() ? { month: month.trim() } : undefined;
    return this.http.get<GymAdminListResponse>(`${this.base}/reservations`, { params });
  }

  updateStatus(id: number, status: ReservationStatus) {
    return this.http.patch<GymAdminActionResponse>(
      `${this.base}/reservations/${id}/status`,
      {},
      { params: { status } },
    );
  }

  setCoordination(id: number, body: SetCoordinationRequest) {
    return this.http.post<GymAdminActionResponse>(
      `${this.base}/reservations/${id}/coordination`,
      body,
    );
  }

  reschedule(id: number, reservedDates: ReservedDateSlot[]) {
    return this.http.put<GymAdminActionResponse>(
      `${this.base}/reservations/${id}/reschedule`,
      { reservedDates } satisfies RescheduleRequest,
    );
  }
}
