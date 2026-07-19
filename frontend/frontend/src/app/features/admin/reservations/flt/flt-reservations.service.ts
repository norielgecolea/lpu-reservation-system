import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  FltAdminActionResponse,
  FltAdminListResponse,
  ReservationStatus,
  RescheduleRequest,
  ReservedDateSlot,
  SetCoordinationRequest,
} from './flt-reservations.models';

@Injectable({ providedIn: 'root' })
export class FltReservationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/flt`;

  getAll(month?: string) {
    const params = month?.trim() ? { month: month.trim() } : undefined;
    return this.http.get<FltAdminListResponse>(`${this.base}/reservations`, { params });
  }

  updateStatus(id: number, status: ReservationStatus) {
    return this.http.patch<FltAdminActionResponse>(
      `${this.base}/reservations/${id}/status`,
      {},
      { params: { status } },
    );
  }

  setCoordination(id: number, body: SetCoordinationRequest) {
    return this.http.post<FltAdminActionResponse>(
      `${this.base}/reservations/${id}/coordination`,
      body,
    );
  }

  reschedule(id: number, reservedDates: ReservedDateSlot[]) {
    return this.http.put<FltAdminActionResponse>(
      `${this.base}/reservations/${id}/reschedule`,
      { reservedDates } satisfies RescheduleRequest,
    );
  }
}
