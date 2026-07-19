import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';

export interface MaintenanceBlock {
  id: number;
  facilityType: string;
  blockDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
}

export interface MaintenanceBlockResponse {
  success: boolean;
  message: string;
  blocks?: MaintenanceBlock[];
  block?: MaintenanceBlock;
}

export interface CreateMaintenanceBlockRequest {
  facility: string;
  blockDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly adminBase = `${environment.apiUrl}/admin/maintenance`;
  private readonly publicBase = `${environment.apiUrl}/public/maintenance`;

  /** Admin: fetch blocks for a facility (auth required) */
  getBlocks(facility: string) {
    return this.http.get<MaintenanceBlockResponse>(`${this.adminBase}`, {
      params: { facility },
    });
  }

  /** Admin: create a new block */
  createBlock(req: CreateMaintenanceBlockRequest) {
    return this.http.post<MaintenanceBlockResponse>(`${this.adminBase}`, req);
  }

  /** Admin: delete a block */
  deleteBlock(id: number) {
    return this.http.delete<MaintenanceBlockResponse>(`${this.adminBase}/${id}`);
  }

  /** Public: fetch blocks for calendar display (no auth) */
  getPublicBlocks(facility: string) {
    return this.http.get<MaintenanceBlockResponse>(`${this.publicBase}`, {
      params: { facility },
    });
  }
}
