export interface Facility {
  id: number;
  facilityName: string | null;
  description: string;
}
export interface EquipmentRow {
  id: number;
  name: string | null;
  status: string;
  facilityId: number;
  facilityName: string;
}

export interface PopulateEquipmentsResponse {
  success: boolean;
  message: string;
  equipment: EquipmentRow[];
}

export interface CreateEquipmentRequest {
  name: string;
  id: number;
  status: string;
}

export interface UpdateEquipmentRequest {
  id: number;
  name: string;
  facilityId: number;
  status: string;
}

export interface EquipmentStatementResponse {
  success: boolean;
  message: string;
}
