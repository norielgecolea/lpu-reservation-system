export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'CONFLICT';

export interface ReservedDateSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface VanReservationRow {
  id: number;
  school?: string | null;
  department: string;
  organization: string;
  travelDestination: string;
  passengerNames: string;
  numberOfPassengers: number | null;
  returnTime: string | null;
  contactPerson: string;
  contactEmail: string;
  contactNumber: string;
  reservedDates: string;
  status: ReservationStatus;
  createdAt: string;
  satisfactionRating: number | null;
  vehicleId: number | null;
  vehicleLabel: string | null;
  driverId: number | null;
  driverName: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  additionalRemarks?: string | null;
  requestedVehicleType?: string | null;
}

export interface VanVehicleItem {
  id: number;
  brand: string;
  plate_num: string;
  capacity: number;
  vehicleDescription: string;
  facilityId: number;
  facilityName: string;
  imageUrl?: string;
  Status: string;
}

export interface VanDriverItem {
  id: number;
  fullName: string;
  contactNumber: string;
  status: string;
}

export interface VanApprovedScheduleEvent {
  department: string;
  organization: string;
  travelDestination: string;
  date: string;
  startTime: string;
  endTime: string;
  vehicleId: number | null;
  vehicleLabel: string | null;
  eventKind?: string;
  reservationId?: number | null;
}

export interface VanApproveRequest {
  vehicleId: number;
  driverId: number;
}

export interface RescheduleRequest {
  reservedDates: ReservedDateSlot[];
}

export interface VanAdminListResponse {
  success: boolean;
  message: string;
  reservations?: VanReservationRow[];
  vehicles?: VanVehicleItem[];
  drivers?: VanDriverItem[];
  approvedEvents?: VanApprovedScheduleEvent[];
}

export interface VanAdminActionResponse {
  success: boolean;
  message: string;
  blockedReason?: string;
  conflictedIds?: number[];
  revertedIds?: number[];
}

export function vehicleLabel(v: VanVehicleItem): string {
  return `${v.brand} (${v.plate_num})`;
}
