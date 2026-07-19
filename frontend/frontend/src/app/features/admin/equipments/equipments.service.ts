import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import {
  CreateEquipmentRequest,
  EquipmentStatementResponse,
  Facility,
  PopulateEquipmentsResponse,
  UpdateEquipmentRequest,
} from './equipments.models';

export type EquipmentScope = 'admin' | 'facilities';

@Injectable({ providedIn: 'root' })
export class EquipmentsService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  scope(): EquipmentScope {
    return this.router.url.includes('/facilities/equipments') ? 'facilities' : 'admin';
  }

  basePath(): string {
    return this.scope() === 'facilities' ? 'facilities' : 'admin';
  }

  listPath(): string {
    return this.scope() === 'facilities' ? '/facilities/equipments' : '/equipments';
  }

  list() {
    return this.http.get<PopulateEquipmentsResponse>(`${this.base}/${this.basePath()}/equipment`);
  }

  listFacilities() {
    return this.http.get<Facility[]>(`${this.base}/${this.basePath()}/facility`);
  }

  create(payload: CreateEquipmentRequest) {
    return this.http.post<EquipmentStatementResponse>(
      `${this.base}/${this.basePath()}/createequipment`,
      payload,
    );
  }

  update(payload: UpdateEquipmentRequest) {
    return this.http.put<EquipmentStatementResponse>(
      `${this.base}/${this.basePath()}/updateequipment`,
      payload,
    );
  }

  remove(id: number) {
    return this.http.delete<EquipmentStatementResponse>(`${this.base}/${this.basePath()}/deleteequipment`, {
      params: { id },
    });
  }

  toggleStatus(id: number) {
    return this.http.patch<EquipmentStatementResponse>(
      `${this.base}/${this.basePath()}/toggleequipmentstat`,
      {},
      { params: { id } },
    );
  }
}
