/** Check if a reservation row matches the approver status filter (PENDING includes CONFLICT). */
export function reservationMatchesStatusFilter(filter: string, status: string): boolean {
  if (filter === 'All') return true;
  if (filter === 'PENDING') return status === 'PENDING' || status === 'CONFLICT';
  // Align with dashboard cards: Approved includes completed; Rejected includes cancelled.
  if (filter === 'APPROVED') return status === 'APPROVED' || status === 'COMPLETED';
  if (filter === 'REJECTED') return status === 'REJECTED' || status === 'CANCELLED';
  return status === filter;
}

export type ApproverStatusTone =
  | 'neutral'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'conflict';

const STATUS_TONE: Record<string, ApproverStatusTone> = {
  All: 'neutral',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  CONFLICT: 'conflict',
};

/** Build filter-chip descriptors with counts for the current reservation set. */
export function buildApproverStatusChips(
  statuses: readonly string[],
  rows: ReadonlyArray<{ status: string }>,
): Array<{ value: string; label: string; count: number; tone: ApproverStatusTone }> {
  return statuses.map((value) => ({
    value,
    label: value === 'All' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase(),
    count: value === 'All'
      ? rows.length
      : rows.filter((r) => reservationMatchesStatusFilter(value, r.status)).length,
    tone: STATUS_TONE[value] ?? 'neutral',
  }));
}

/** Sort so actionable queue items (pending/conflict) surface first, then by age. */
export function sortApproverReservations<T extends { status: string; createdAt: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const rank = (status: string) =>
      status === 'PENDING' || status === 'CONFLICT' ? 0 : 1;
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/** Parse a status query param into a known filter value, or null if invalid. */
export function parseStatusFilterParam(
  value: string | null | undefined,
  allowed: readonly string[],
): string | null {
  if (!value) return null;
  return allowed.includes(value) ? value : null;
}

/** Check if a reservation row belongs to the given YYYY-MM month filter. */
export function reservationMatchesMonth(
  reservedDatesJson: string,
  coordinationDate: string | null,
  createdAt: string,
  monthPrefix: string,
): boolean {
  if (!monthPrefix) return true;

  try {
    const slots: Array<{ date?: string }> = JSON.parse(reservedDatesJson) ?? [];
    if (slots.some(s => s.date?.startsWith(monthPrefix))) return true;
  } catch {
    // ignore parse errors
  }

  if (coordinationDate?.startsWith(monthPrefix)) return true;

  if (createdAt?.startsWith(monthPrefix)) return true;

  return false;
}
