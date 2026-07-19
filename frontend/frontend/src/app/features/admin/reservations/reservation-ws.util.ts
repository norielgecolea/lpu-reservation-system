import { ReservationWsEvent } from './reservation-realtime.service';

export type ReservationFacility = 'flt' | 'gymnasium' | 'van';

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'CONFLICT';

export const RESERVATION_WS_TOPICS: Record<ReservationFacility, string> = {
  flt: '/topic/reservations/flt',
  gymnasium: '/topic/reservations/gymnasium',
  van: '/topic/reservations/van',
};

/** Normalize STOMP JSON payload field types from the backend. */
export function parseReservationWsEvent(body: string): ReservationWsEvent {
  const raw = JSON.parse(body) as Record<string, unknown>;
  return {
    type: raw['type'] as ReservationWsEvent['type'],
    reservationId: Number(raw['reservationId']),
    status: String(raw['status'] ?? ''),
    conflictedIds: Array.isArray(raw['conflictedIds'])
      ? raw['conflictedIds'].map(id => Number(id))
      : [],
    revertedIds: Array.isArray(raw['revertedIds'])
      ? raw['revertedIds'].map(id => Number(id))
      : [],
    timestamp: raw['timestamp'] != null ? String(raw['timestamp']) : undefined,
  };
}

interface ReservationRow {
  id: number;
  status: ReservationStatus;
}

const VALID_WS_STATUSES = new Set<string>([
  'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'CONFLICT',
]);

/** Apply reverted conflict IDs from an HTTP action response. */
export function applyRevertedIds<T extends ReservationRow>(
  list: T[],
  revertedIds: number[] | undefined,
): T[] {
  const ids = (revertedIds ?? []).filter(id => !Number.isNaN(id));
  if (!ids.length) return list;
  return list.map(row =>
    ids.includes(row.id) ? { ...row, status: 'PENDING' as ReservationStatus } : row,
  );
}

/** Apply a realtime event to the in-memory admin list. */
export function applyReservationWsEvent<T extends ReservationRow>(
  list: T[],
  ev: ReservationWsEvent,
): { updated: T[]; needsReload: boolean } {
  if (ev.type === 'CREATED' || Number.isNaN(ev.reservationId)) {
    return { updated: list, needsReload: true };
  }

  const resId = ev.reservationId;
  const conflictIds = (ev.conflictedIds ?? []).filter(id => !Number.isNaN(id));
  const revertedIds = (ev.revertedIds ?? []).filter(id => !Number.isNaN(id));
  const affected = new Set<number>([resId, ...conflictIds, ...revertedIds]);

  if (!list.some(r => affected.has(r.id))) {
    return { updated: list, needsReload: true };
  }

  const updated = list.map(row => {
    if (revertedIds.includes(row.id)) {
      return { ...row, status: 'PENDING' as ReservationStatus };
    }
    if (row.id === resId && VALID_WS_STATUSES.has(ev.status)) {
      return { ...row, status: ev.status as ReservationStatus };
    }
    if (conflictIds.includes(row.id)) {
      return { ...row, status: 'CONFLICT' as ReservationStatus };
    }
    return row;
  });

  return { updated, needsReload: false };
}
