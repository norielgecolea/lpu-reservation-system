import { HttpClient } from '@angular/common/http';
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

  getAll(month?: string) {
    const params = month?.trim() ? { month: month.trim() } : undefined;
    return this.http.get<VanAdminListResponse>(`${this.base}/reservations`, { params });
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
