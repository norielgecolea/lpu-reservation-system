export type EoRoomType = 'BOARDROOM' | 'CONFERENCE';
export type EoReservationStatus = 'APPROVED' | 'CANCELLED';

export interface EoReservedDateSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface EoReservationRecord {
  id: number;
  roomType: EoRoomType;
  agenda: string;
  department: string;
  organization: string;
  notes: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
  reservedDates: string;
  status: EoReservationStatus;
  createdBy: string | null;
  createdAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface EoReservePayload {
  roomType: EoRoomType;
  agenda: string;
  department: string;
  organization: string;
  notes?: string | null;
  skipContact: boolean;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactNumber?: string | null;
  reservedDates: EoReservedDateSlot[];
}

export interface EoEventsResponse {
  success: boolean;
  message: string;
  reservations?: EoReservationRecord[];
  reservation?: EoReservationRecord;
}

export interface EoActionResponse {
  success: boolean;
  message: string;
  blockedReason?: string;
}

export const EO_TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7;
  const label = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label };
});

export function eoRoomLabel(room: EoRoomType | string | null | undefined): string {
  return room === 'CONFERENCE' ? 'Conference Room' : 'Boardroom';
}
