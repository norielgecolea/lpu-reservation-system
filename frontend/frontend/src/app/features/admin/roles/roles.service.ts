import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  CreateAppRolePayload,
  RoleManagementResponse,
  UpdateAppRolePayload,
} from './roles.models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/roles`;

  list() {
    return this.http.get<RoleManagementResponse>(this.base);
  }

  create(payload: CreateAppRolePayload) {
    return this.http.post<RoleManagementResponse>(this.base, payload);
  }

  update(code: string, payload: UpdateAppRolePayload) {
    return this.http.put<RoleManagementResponse>(`${this.base}/${encodeURIComponent(code)}`, payload);
  }

  remove(code: string) {
    return this.http.delete<RoleManagementResponse>(`${this.base}/${encodeURIComponent(code)}`);
  }
}
