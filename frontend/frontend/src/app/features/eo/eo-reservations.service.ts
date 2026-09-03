import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  EoActionResponse,
  EoEventsResponse,
  EoReservePayload,
  EoRoomType,
} from './eo-reservations.models';

@Injectable({ providedIn: 'root' })
export class EoReservationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/eo`;

  listEvents(month: string, roomType?: EoRoomType) {
    let params = new HttpParams().set('month', month);
    if (roomType) params = params.set('roomType', roomType);
    return this.http.get<EoEventsResponse>(`${this.base}/events`, { params });
  }

  getOne(id: number) {
    return this.http.get<EoEventsResponse>(`${this.base}/${id}`);
  }

  reserve(payload: EoReservePayload) {
    return this.http.post<EoActionResponse>(`${this.base}/reserve`, payload);
  }

  cancel(id: number) {
    return this.http.post<EoActionResponse>(`${this.base}/${id}/cancel`, {});
  }
}
