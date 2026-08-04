export interface ReservedSlotLike {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CoordinationLike {
  coordinationDate?: string | null;
  coordinationStartTime?: string | null;
  coordinationEndTime?: string | null;
}

export function parseReservedDatesJson(json: string): ReservedSlotLike[] {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

export function parseEquipmentJson<T extends { id: number | string }>(json: string | null): T[] {
  if (!json) return [];
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

export function slotsOverlap(a: ReservedSlotLike[], b: ReservedSlotLike[]): boolean {
  for (const sa of a) {
    for (const sb of b) {
      if (sa.date !== sb.date) continue;
      const aStart = parseInt(sa.startTime, 10);
      const aEnd = parseInt(sa.endTime, 10);
      const bStart = parseInt(sb.startTime, 10);
      const bEnd = parseInt(sb.endTime, 10);
      if (aStart < bEnd && aEnd > bStart) return true;
    }
  }
  return false;
}

function coordinationSlots(row: CoordinationLike): ReservedSlotLike[] {
  if (!row.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) {
    return [];
  }
  return [{
    date: row.coordinationDate,
    startTime: row.coordinationStartTime,
    endTime: row.coordinationEndTime,
  }];
}

/** Precompute pending rows that overlap an APPROVED/COMPLETED reservation (or its coordination). */
export function buildApprovedOverlapIds<T extends CoordinationLike & { id: number; status: string; reservedDates: string }>(
  rows: T[],
): Set<number> {
  const blocking: { id: number; slots: ReservedSlotLike[] }[] = [];
  for (const row of rows) {
    if (row.status !== 'APPROVED' && row.status !== 'COMPLETED') continue;
    blocking.push({
      id: row.id,
      slots: [...parseReservedDatesJson(row.reservedDates), ...coordinationSlots(row)],
    });
  }

  const conflictIds = new Set<number>();
  for (const row of rows) {
    if (row.status !== 'PENDING') continue;
    const targetSlots = parseReservedDatesJson(row.reservedDates);
    if (!targetSlots.length) continue;
    for (const other of blocking) {
      if (other.id === row.id) continue;
      if (slotsOverlap(targetSlots, other.slots)) {
        conflictIds.add(row.id);
        break;
      }
    }
  }
  return conflictIds;
}
