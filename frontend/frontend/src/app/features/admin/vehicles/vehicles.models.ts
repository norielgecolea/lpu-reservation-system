export const VAN_FACILITY_ID = 2;

export interface VehicleRow {
  capacity: number;
  vehicleDescription: string;
  status: string;
  id: number;
  facilityId: number;
  plate_num: string;
  brand: string;
  facilityName: string;
  image?: string;
  imagePath?: string;
  imageUrl?: string;
  photo?: string;
  vehicleImage?: string;
  assignedDriverName?: string | null;
  assignedDriverContact?: string | null;
}

export interface PopulateVehiclesResponse {
  success: boolean;
  message: string;
  equipment?: VehicleRow[];
  vehicles?: VehicleRow[];
}

export interface CreateVehicleRequest {
  capacity: number;
  vehicleDescription: string;
  status: string;
  id: number;
  plate_num: string;
  brand: string;
  assignedDriverName?: string | null;
  assignedDriverContact?: string | null;
  image?: File | string | null;
}

export interface UpdateVehicleRequest {
  id: number;
  facilityId: number;
  capacity: number;
  vehicleDescription: string;
  status: string;
  plate_num: string;
  brand: string;
  assignedDriverName?: string | null;
  assignedDriverContact?: string | null;
  image?: File | string | null;
}

export interface VehicleStatementResponse {
  success: boolean;
  message: string;
}
