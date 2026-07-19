import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AccountStatementResponse,
  CreateAccountRequest,
  PopulateUsersResponse,
  ResetPasswordRequest,
  UpdateUserRequest,
} from './users.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list() {
    return this.http.get<PopulateUsersResponse>(`${this.base}/admin/users`);
  }

  create(payload: CreateAccountRequest) {
    return this.http.post<AccountStatementResponse>(`${this.base}/admin/createuser`, payload);
  }

  update(payload: UpdateUserRequest) {
    return this.http.put<AccountStatementResponse>(`${this.base}/admin/updateuser`, payload);
  }

  remove(empId: string) {
    return this.http.delete<AccountStatementResponse>(`${this.base}/admin/deleteacc`, {
      params: { empId },
    });
  }

  toggleStatus(empId: string) {
    return this.http.patch<AccountStatementResponse>(
      `${this.base}/admin/toggleaccstat`,
      {},
      {
        params: { empId },
      },
    );
  }

  resetPassword(payload: ResetPasswordRequest) {
    return this.http.patch<AccountStatementResponse>(`${this.base}/admin/resetpassword`, payload);
  }
}
