export interface ReservedDateSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface VanApprovedEvent {
  vehicleId: number;
  vehicleLabel: string;
  driverName?: string | null;
  travelDestination: string;
  department: string;
  organization: string;
  date: string;
  startTime: string;
  endTime: string;
  eventKind?: 'RESERVATION' | 'COORDINATION';
}

export interface VanApprovedEventsResponse {
  success: boolean;
  message: string;
  approvedEvents: VanApprovedEvent[];
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

export interface VanVehiclesResponse {
  success: boolean;
  message: string;
  vehicles: VanVehicleItem[];
}

export interface VanReservationPayload {
  school: string;
  department: string;
  organization: string;
  travelDestination: string;
  passengerNames: string;
  numberOfPassengers: number;
  returnTime: string;
  contactPerson: string;
  contactEmail: string;
  contactNumber: string;
  reservedDates: ReservedDateSlot[];
  additionalRemarks?: string;
  requestedVehicleType?: string;
  otpToken?: string;
}

export interface VanReservationApiResponse {
  success: boolean;
  message: string;
}

export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7;
  const label = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label };
});
