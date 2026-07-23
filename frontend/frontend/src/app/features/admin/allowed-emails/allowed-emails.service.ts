import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AllowedEmailRow,
  CreateAllowedEmailRequest,
  EmailCheckResponse,
  ImportAllowedEmailsRequest,
  PopulateAllowedEmailsResponse,
  SimpleApiResponse,
} from './allowed-emails.models';

@Injectable({ providedIn: 'root' })
export class AllowedEmailsService {
  private readonly http = inject(HttpClient);
  private readonly adminBase = `${environment.apiUrl}/admin/allowed-emails`;
  private readonly publicBase = `${environment.apiUrl}/public/allowed-emails`;

  list(query?: { page?: number; size?: number; search?: string }) {
    let params = new URLSearchParams();
    params.set('page', String(query?.page ?? 0));
    params.set('size', String(query?.size ?? 100));
    if (query?.search?.trim()) params.set('search', query.search.trim());
    return this.http.get<PopulateAllowedEmailsResponse>(this.adminBase, {
      params: Object.fromEntries(params.entries()),
    });
  }

  create(payload: CreateAllowedEmailRequest) {
    return this.http.post<SimpleApiResponse>(this.adminBase, payload);
  }

  importAndReplace(payload: ImportAllowedEmailsRequest) {
    return this.http.post<SimpleApiResponse>(`${this.adminBase}/import`, payload);
  }

  toggleStatus(id: number) {
    return this.http.patch<SimpleApiResponse>(`${this.adminBase}/toggle`, {}, { params: { id } });
  }

  remove(id: number) {
    return this.http.delete<SimpleApiResponse>(this.adminBase, { params: { id } });
  }

  checkEmail(email: string) {
    return this.http.get<EmailCheckResponse>(`${this.publicBase}/check`, {
      params: { email: email.trim().toLowerCase() },
    });
  }
}

export type { AllowedEmailRow };
