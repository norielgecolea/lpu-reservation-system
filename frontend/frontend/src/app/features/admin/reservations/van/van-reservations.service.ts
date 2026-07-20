import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  RescheduleRequest,
  ReservedDateSlot,
  ReservationStatus,
  VanAdminActionResponse,
  VanAdminListResponse,
  VanApproveRequest,
} from './van-reservations.models';

@Injectable({ providedIn: 'root' })
export class VanReservationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/van`;

  getAll(query?: string | { month?: string; fromDate?: string; toDate?: string }) {
    return this.http.get<VanAdminListResponse>(`${this.base}/reservations`, {
      params: toHttpParams(query),
    });
  }

  getVehicles() {
    return this.http.get<VanAdminListResponse>(`${this.base}/vehicles`);
  }

  getAvailableVehiclesForReservation(reservationId: number) {
    return this.http.get<VanAdminListResponse>(
      `${this.base}/reservations/${reservationId}/available-vehicles`,
    );
  }

  getDrivers() {
    return this.http.get<VanAdminListResponse>(`${this.base}/drivers`);
  }

  getAvailableDriversForReservation(reservationId: number) {
    return this.http.get<VanAdminListResponse>(
      `${this.base}/reservations/${reservationId}/available-drivers`,
    );
  }

  getVehicleSchedule(vehicleId: number, excludeReservationId?: number) {
    const params: Record<string, string> = {};
    if (excludeReservationId != null) {
      params['excludeReservationId'] = String(excludeReservationId);
    }
    return this.http.get<VanAdminListResponse>(`${this.base}/vehicles/${vehicleId}/schedule`, { params });
  }

  getDriverSchedule(driverId: number, excludeReservationId?: number) {
    const params: Record<string, string> = {};
    if (excludeReservationId != null) {
      params['excludeReservationId'] = String(excludeReservationId);
    }
    return this.http.get<VanAdminListResponse>(`${this.base}/drivers/${driverId}/schedule`, { params });
  }

  approve(id: number, body: VanApproveRequest) {
    return this.http.post<VanAdminActionResponse>(
      `${this.base}/reservations/${id}/approve`,
      body,
    );
  }

  reassign(id: number, body: VanApproveRequest) {
    return this.http.put<VanAdminActionResponse>(
      `${this.base}/reservations/${id}/reassign`,
      body,
    );
  }

  updateStatus(id: number, status: ReservationStatus) {
    return this.http.patch<VanAdminActionResponse>(
      `${this.base}/reservations/${id}/status`,
      {},
      { params: { status } },
    );
  }

  reschedule(id: number, reservedDates: ReservedDateSlot[]) {
    return this.http.put<VanAdminActionResponse>(
      `${this.base}/reservations/${id}/reschedule`,
      { reservedDates } satisfies RescheduleRequest,
    );
  }
}

function toHttpParams(query?: string | { month?: string; fromDate?: string; toDate?: string }): HttpParams {
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
