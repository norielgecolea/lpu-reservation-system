import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  GymAdminActionResponse,
  GymAdminListResponse,
  GymnasiumReservationDetailsEditRequest,
  ReservationStatus,
  RescheduleRequest,
  ReservedDateSlot,
  SetCoordinationRequest,
} from './gymnasium-reservations.models';

export interface ReservationListQuery {
  month?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable({ providedIn: 'root' })
export class GymReservationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/gymnasium`;

  getAll(query?: string | ReservationListQuery) {
    return this.http.get<GymAdminListResponse>(`${this.base}/reservations`, {
      params: toHttpParams(query),
    });
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

  updateDetails(id: number, body: GymnasiumReservationDetailsEditRequest) {
    return this.http.put<GymAdminActionResponse>(`${this.base}/reservations/${id}/details`, body);
  }

  delete(id: number) {
    return this.http.delete<GymAdminActionResponse>(`${this.base}/reservations/${id}`);
  }
}

function toHttpParams(query?: string | ReservationListQuery): HttpParams {
  let params = new HttpParams();
  if (typeof query === 'string') {
    const month = query.trim();
    return month ? params.set('month', month) : params;
  }
  if (!query) return params;
  const fromDate = query.fromDate?.trim();
  const toDate = query.toDate?.trim();
  if (fromDate && toDate) {
    return params.set('fromDate', fromDate).set('toDate', toDate);
  }
  const month = query.month?.trim();
  return month ? params.set('month', month) : params;
}
