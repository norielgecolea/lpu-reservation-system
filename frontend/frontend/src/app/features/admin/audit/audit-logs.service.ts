import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { AuditLogResponse, AuditServiceCode } from './audit-logs.models';

export interface AuditLogQuery {
  service: AuditServiceCode;
  page?: number;
  size?: number;
  actionType?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(query: AuditLogQuery) {
    let params = new HttpParams()
      .set('service', query.service)
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 25));

    if (query.actionType?.trim()) {
      params = params.set('actionType', query.actionType.trim());
    }
    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.fromDate?.trim()) {
      params = params.set('fromDate', query.fromDate.trim());
    }
    if (query.toDate?.trim()) {
      params = params.set('toDate', query.toDate.trim());
    }

    return this.http.get<AuditLogResponse>(`${this.base}/admin/audit/logs`, { params });
  }

  actionTypes(service: AuditServiceCode) {
    return this.http.get<AuditLogResponse>(`${this.base}/admin/audit/action-types`, {
      params: { service },
    });
  }
}
