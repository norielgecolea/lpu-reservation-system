import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  NexusAdminActionResponse,
  NexusAdminListResponse,
  NexusReservationDetailsEditRequest,
  ReservationStatus,
  RescheduleRequest,
  ReservedDateSlot,
  SetCoordinationRequest,
} from './nexus-reservations.models';

export interface ReservationListQuery {
  month?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable({ providedIn: 'root' })
export class NexusReservationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/nexus`;

  getAll(query?: string | ReservationListQuery) {
    return this.http.get<NexusAdminListResponse>(`${this.base}/reservations`, {
      params: toHttpParams(query),
    });
  }

  updateStatus(id: number, status: ReservationStatus) {
    return this.http.patch<NexusAdminActionResponse>(
      `${this.base}/reservations/${id}/status`,
      {},
      { params: { status } },
    );
  }

  setCoordination(id: number, body: SetCoordinationRequest) {
    return this.http.post<NexusAdminActionResponse>(
      `${this.base}/reservations/${id}/coordination`,
      body,
    );
  }

  reschedule(id: number, reservedDates: ReservedDateSlot[]) {
    return this.http.put<NexusAdminActionResponse>(
      `${this.base}/reservations/${id}/reschedule`,
      { reservedDates } satisfies RescheduleRequest,
    );
  }

  updateDetails(id: number, body: NexusReservationDetailsEditRequest) {
    return this.http.put<NexusAdminActionResponse>(`${this.base}/reservations/${id}/details`, body);
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
