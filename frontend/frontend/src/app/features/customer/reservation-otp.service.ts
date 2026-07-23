import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface ReservationOtpApiResponse {
  success: boolean;
  message: string;
  otpToken?: string;
}

@Injectable({ providedIn: 'root' })
export class ReservationOtpService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/public/reservation-otp`;

  sendCode(email: string, contactPerson: string) {
    return this.http.post<ReservationOtpApiResponse>(`${this.base}/send`, {
      email,
      contactPerson,
    });
  }

  verifyCode(email: string, code: string) {
    return this.http.post<ReservationOtpApiResponse>(`${this.base}/verify`, {
      email,
      code,
    });
  }
}
