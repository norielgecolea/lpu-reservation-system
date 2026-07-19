export interface ReservedDateSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface FltEquipmentItem {
  id: number;
  name: string;
  status: string;
  facilityId: number;
  facilityName: string;
}

export interface FltEquipmentResponse {
  success: boolean;
  message: string;
  equipment: FltEquipmentItem[];
}

export interface FltOccupiedDatesResponse {
  success: boolean;
  message: string;
  occupiedDates: string[];
}

export interface FltReservationPayload {
  roomType: string;
  expectedAttendees: number;
  eventTitle: string;
  eventType: string;
  department: string;
  organization: string;
  additionalInstructions?: string;
  contactPerson: string;
  contactEmail: string;
  contactNumber: string;
  reservedDates: ReservedDateSlot[];
  requestedEquipment: { id: number; name: string }[];
}

export interface FltReservationApiResponse {
  success: boolean;
  message: string;
}

export interface FltApprovedEvent {
  eventTitle: string;
  department: string;
  organization: string;
  date: string;
  startTime: string;
  endTime: string;
  eventKind?: 'RESERVATION' | 'COORDINATION';
}

export interface FltApprovedEventsResponse {
  success: boolean;
  message: string;
  approvedEvents: FltApprovedEvent[];
}

export const FLT_ROOM_TYPES = [
  { value: 'flt_theater',  label: 'FLT Theater',  maxPax: 300 },
  { value: 'amphitheater', label: 'Amphitheater',  maxPax: 150 },
  { value: 'banquet_hall', label: 'Banquet Hall',  maxPax: 100 },
] as const;

export type FltRoomTypeValue = (typeof FLT_ROOM_TYPES)[number]['value'];

export const FLT_EVENT_TYPES = [
  { value: 'Conference', label: 'Conference' },
  { value: 'Seminar', label: 'Seminar' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Performance', label: 'Performance' },
  { value: 'Other', label: 'Other' },
] as const;

export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7;
  const label = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label };
});
