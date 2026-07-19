export interface RoomReservationFeature {
  icon: string;
  label: string;
}

export interface RoomReservationFacility {
  title: string;
  occupiedDates?: string[];
  features?: RoomReservationFeature[];
}
