export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'CONFLICT';

export interface ReservedDateSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface RequestedEquipmentItem {
  id: number;
  name: string;
}

export interface GymReservationRecord {
  id: number;
  eventTitle: string;
  department: string;
  organization: string;
  numberOfAttendees: string | null;
  contactPerson: string;
  contactEmail: string;
  contactNumber: string;
  reservedDates: string;
  requestedEquipment: string | null;
  coordinationDate: string | null;
  coordinationStartTime: string | null;
  coordinationEndTime: string | null;
  additionalInstructions: string | null;
  status: ReservationStatus;
  createdAt: string;
  satisfactionRating: number | null;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface SetCoordinationRequest {
  date: string;
  startTime: string;
  endTime: string;
}

export interface RescheduleRequest {
  reservedDates: ReservedDateSlot[];
}

export interface GymAdminListResponse {
  success: boolean;
  message: string;
  reservations: GymReservationRecord[];
}

export interface GymAdminActionResponse {
  success: boolean;
  message: string;
  blockedReason?: string;
  conflictedIds?: number[];
  revertedIds?: number[];
}
