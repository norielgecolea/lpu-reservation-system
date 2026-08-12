export interface ReservedDateSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface NexusEquipmentItem {
  id: number;
  name: string;
  status: string;
  facilityId: number;
  facilityName: string;
}

export interface NexusEquipmentResponse {
  success: boolean;
  message: string;
  equipment: NexusEquipmentItem[];
}

export interface NexusReservationPayload {
  eventTitle: string;
  department: string;
  organization: string;
  numberOfAttendees: number;
  additionalInstructions?: string;
  contactPerson: string;
  contactEmail: string;
  contactNumber: string;
  reservedDates: ReservedDateSlot[];
  requestedEquipment: { id: number; name: string }[];
  otpToken?: string;
}

export interface NexusReservationApiResponse {
  success: boolean;
  message: string;
}

export interface NexusApprovedEvent {
  eventTitle: string;
  department: string;
  organization: string;
  date: string;
  startTime: string;
  endTime: string;
  eventKind?: 'RESERVATION' | 'COORDINATION';
}

export interface NexusApprovedEventsResponse {
  success: boolean;
  message: string;
  approvedEvents: NexusApprovedEvent[];
}

export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7;
  const label = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label };
});
