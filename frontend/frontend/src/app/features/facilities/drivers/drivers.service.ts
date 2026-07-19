import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';

export interface DriverRow {
  id: number;
  fullName: string;
  contactNumber: string;
  status: string;
}

export interface DriverListResponse {
  success: boolean;
  message: string;
  drivers?: DriverRow[];
}

export interface DriverActionResponse {
  success: boolean;
  message: string;
}

export interface CreateDriverRequest {
  fullName: string;
  contactNumber: string;
  status?: string;
}

export interface UpdateDriverRequest {
  id: number;
  fullName: string;
  contactNumber: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class DriversService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/facilities/drivers`;

  list() {
    return this.http.get<DriverListResponse>(this.base);
  }

  create(payload: CreateDriverRequest) {
    return this.http.post<DriverActionResponse>(this.base, payload);
  }

  update(payload: UpdateDriverRequest) {
    return this.http.put<DriverActionResponse>(this.base, payload);
  }

  toggleStatus(id: number) {
    return this.http.patch<DriverActionResponse>(`${this.base}/toggle-status`, {}, { params: { id } });
  }

  remove(id: number) {
    return this.http.delete<DriverActionResponse>(this.base, { params: { id } });
  }
}
