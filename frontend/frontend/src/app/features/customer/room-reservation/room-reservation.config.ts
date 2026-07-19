import type { RoomReservationFacility } from './room-reservation.models';

export const ROOM_RESERVATION_FACILITIES: Record<string, RoomReservationFacility> = {
  boardroom: {
    title: 'Boardroom',
    features: [
      { icon: 'groups', label: 'Scalable Capacity (Up to 20)' },
      { icon: 'language', label: 'Campus Wi-Fi & Fiber Ready' },
    ],
  },
  conferenceRoom: {
    title: 'Conference Room',
    features: [
      { icon: 'meeting_room', label: 'Conference-Ready Seating' },
      { icon: 'language', label: 'Campus Wi-Fi & Fiber Ready' },
    ],
  },
  gymnasium: {
    title: 'Gymnasium',
    features: [
      { icon: 'sports_basketball', label: 'Large-Capacity Event Space' },
      { icon: 'language', label: 'Campus Wi-Fi & Fiber Ready' },
    ],
  },
  nexusRoom: {
    title: 'Nexus Room',
    features: [
      { icon: 'co_present', label: 'Collaborative Room Setup' },
      { icon: 'language', label: 'Campus Wi-Fi & Fiber Ready' },
    ],
  },
};
