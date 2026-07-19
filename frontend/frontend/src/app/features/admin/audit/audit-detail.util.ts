import { formatReadableDateTime, formatTime12 } from '../../../shared/utils/datetime.util';

function parseDetails(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatSlotDates(json: unknown): string {
  if (!json) return '';
  try {
    const slots = typeof json === 'string' ? JSON.parse(json) : json;
    if (!Array.isArray(slots)) return String(json);
    return slots
      .map((s: { date?: string; startTime?: string; endTime?: string }) => {
        const date = s.date ?? '';
        const start = s.startTime ? formatTime12(s.startTime) : '';
        const end = s.endTime ? formatTime12(s.endTime) : '';
        return `${date} ${start}–${end}`.trim();
      })
      .join('; ');
  } catch {
    return String(json);
  }
}

export function formatAuditDetails(actionType: string, detailsRaw: string | null | undefined): string {
  const d = parseDetails(detailsRaw);
  if (!d) return '—';

  const parts: string[] = [];

  if (d['previousStatus'] && d['newStatus']) {
    parts.push(`Status: ${d['previousStatus']} → ${d['newStatus']}`);
  } else if (d['newStatus']) {
    parts.push(`Status: ${d['newStatus']}`);
  }

  if (d['previousDates'] || d['newDates']) {
    if (d['previousDates']) parts.push(`From: ${formatSlotDates(d['previousDates'])}`);
    if (d['newDates']) parts.push(`To: ${formatSlotDates(d['newDates'])}`);
  }

  if (d['coordinationDate']) {
    const start = d['startTime'] ? formatTime12(String(d['startTime'])) : '';
    const end = d['endTime'] ? formatTime12(String(d['endTime'])) : '';
    parts.push(`Coordination: ${d['coordinationDate']} ${start}–${end}`.trim());
  }

  if (d['vehicleId']) parts.push(`Vehicle ID: ${d['vehicleId']}`);
  if (d['driverId']) parts.push(`Driver ID: ${d['driverId']}`);

  if (d['facility']) parts.push(`Facility: ${d['facility']}`);
  if (d['blockDate']) {
    const start = d['startTime'] ? formatTime12(String(d['startTime'])) : '';
    const end = d['endTime'] ? formatTime12(String(d['endTime'])) : '';
    parts.push(`Block: ${d['blockDate']} ${start}–${end}`.trim());
  }
  if (d['reason']) parts.push(`Reason: ${d['reason']}`);

  if (d['employeeId']) parts.push(`Employee ID: ${d['employeeId']}`);
  if (d['username']) parts.push(`Username: ${d['username']}`);
  if (d['role']) parts.push(`Role: ${d['role']}`);

  if (Array.isArray(d['conflictedIds']) && d['conflictedIds'].length) {
    parts.push(`Conflicted: #${(d['conflictedIds'] as unknown[]).join(', #')}`);
  }
  if (Array.isArray(d['revertedIds']) && d['revertedIds'].length) {
    parts.push(`Reverted: #${(d['revertedIds'] as unknown[]).join(', #')}`);
  }

  if (d['previousStatus'] && d['newStatus'] && actionType === 'TOGGLE_STATUS') {
    parts.push(`Status: ${d['previousStatus']} → ${d['newStatus']}`);
  }

  return parts.length ? parts.join(' · ') : '—';
}

export function formatAuditActionLabel(actionType: string): string {
  return actionType
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatAuditTimestamp(value: string | null | undefined): string {
  return formatReadableDateTime(value);
}
