export const RESERVATION_ADVANCE_DAYS = {
  FLT: 14,
  GYMNASIUM: 3,
  VAN: 5,
} as const;

export type ReservationServiceKey = keyof typeof RESERVATION_ADVANCE_DAYS;

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Earliest selectable date: today + advanceDays (0 = today). */
export function getMinBookableDateStr(advanceDays: number, from = new Date()): string {
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + Math.max(0, advanceDays));
  return formatDateKey(base);
}

export function advanceNoticeText(advanceDays: number, extraPrefix = ''): string | null {
  if (advanceDays <= 0) return null;
  const prefix = extraPrefix ? `${extraPrefix} · ` : '';
  if (advanceDays >= 14) {
    return `${prefix}Reservations must be made at least 2 weeks in advance`;
  }
  return `${prefix}Reservations must be made at least ${advanceDays} days in advance`;
}
