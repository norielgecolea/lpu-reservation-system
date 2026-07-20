import {
  formatReadableDate,
  formatReadableDateTime,
  formatReadableTime,
  formatTimeRange,
} from '../dashboard/dashboard-events.util';

export type ExportScope = 'range';

export interface ExportDateRange {
  scope: ExportScope;
  startDate: string;
  endDate: string;
}

function parseSlots(json: string): Array<{ date?: string }> {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** True when any reserved slot, coordination date, or created_at falls within [start, end]. */
export function reservationMatchesExportRange(
  reservedDatesJson: string,
  coordinationDate: string | null,
  createdAt: string,
  range: ExportDateRange,
): boolean {
  const start = range.startDate ?? '';
  const end = range.endDate ?? '';
  if (!start || !end) return false;

  const slots = parseSlots(reservedDatesJson);
  if (slots.some(s => s.date && dateInRange(s.date, start, end))) return true;
  if (coordinationDate && dateInRange(coordinationDate, start, end)) return true;
  if (createdAt && createdAt.slice(0, 10) >= start && createdAt.slice(0, 10) <= end) return true;

  return false;
}

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatEquipment(json: string | null | undefined): string {
  if (!json) return '';
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return '';
    return parsed.map((item: { name?: string }) => item.name ?? '').filter(Boolean).join('; ');
  } catch {
    return '';
  }
}

function formatSlots(json: string): string {
  try {
    const slots: Array<{ date?: string; startTime?: string; endTime?: string }> = JSON.parse(json) ?? [];
    return slots
      .map(s => {
        const datePart = s.date ? formatReadableDate(s.date) : '';
        const timePart =
          s.startTime && s.endTime ? formatTimeRange(s.startTime, s.endTime) : '';
        return [datePart, timePart].filter(Boolean).join(' · ');
      })
      .filter(Boolean)
      .join('; ');
  } catch {
    return '';
  }
}

function formatCoordinationTime(
  start: string | null,
  end: string | null,
): string {
  if (start && end) return formatTimeRange(start, end);
  if (start) return formatReadableTime(start);
  if (end) return formatReadableTime(end);
  return '';
}

export function exportFltReservationsCsv(
  records: Array<{
    id: number;
    eventTitle: string;
    eventType: string;
    department: string;
    organization: string;
    contactPerson: string;
    contactEmail: string;
    contactNumber: string;
    status: string;
    reservedDates: string;
    requestedEquipment: string | null;
    roomType: string | null;
    expectedAttendees: string | null;
    coordinationDate: string | null;
    coordinationStartTime: string | null;
    coordinationEndTime: string | null;
    additionalInstructions: string | null;
    createdAt: string;
    approvedAt?: string | null;
    approvedBy?: string | null;
  }>,
  range: ExportDateRange,
): void {
  const filtered = records.filter(r =>
    reservationMatchesExportRange(r.reservedDates, r.coordinationDate, r.createdAt, range),
  );
  const headers = [
    'ID', 'Event Title', 'Event Type', 'Department', 'Organization', 'Contact Person',
    'Contact Email', 'Contact Number', 'Status', 'Reserved Dates', 'Requested Equipment',
    'Room Type', 'Expected Attendees', 'Coordination Date', 'Coordination Time',
    'Additional Instructions', 'Created At', 'Approved Date', 'Approved By',
  ];
  const rows = filtered.map(r => [
    r.id,
    r.eventTitle,
    r.eventType,
    r.department,
    r.organization,
    r.contactPerson,
    r.contactEmail,
    r.contactNumber,
    r.status,
    formatSlots(r.reservedDates),
    formatEquipment(r.requestedEquipment),
    r.roomType ?? '',
    r.expectedAttendees ?? '',
    formatReadableDate(r.coordinationDate),
    formatCoordinationTime(r.coordinationStartTime, r.coordinationEndTime),
    r.additionalInstructions ?? '',
    formatReadableDateTime(r.createdAt),
    formatReadableDateTime(r.approvedAt),
    r.approvedBy ?? '',
  ]);
  const suffix = `${range.startDate}_to_${range.endDate}`;
  downloadCsv(`flt-reservations-${suffix}.csv`, headers, rows);
}

export function exportGymReservationsCsv(
  records: Array<{
    id: number;
    eventTitle: string;
    department: string;
    organization: string;
    numberOfAttendees: string | null;
    contactPerson: string;
    contactEmail: string;
    contactNumber: string;
    status: string;
    reservedDates: string;
    requestedEquipment: string | null;
    coordinationDate: string | null;
    coordinationStartTime: string | null;
    coordinationEndTime: string | null;
    additionalInstructions: string | null;
    createdAt: string;
    approvedAt?: string | null;
    approvedBy?: string | null;
  }>,
  range: ExportDateRange,
): void {
  const filtered = records.filter(r =>
    reservationMatchesExportRange(r.reservedDates, r.coordinationDate, r.createdAt, range),
  );
  const headers = [
    'ID', 'Event Title', 'Department', 'Organization', 'Number of Attendees', 'Contact Person',
    'Contact Email', 'Contact Number', 'Status', 'Reserved Dates', 'Requested Equipment',
    'Coordination Date', 'Coordination Time', 'Additional Instructions', 'Created At',
    'Approved Date', 'Approved By',
  ];
  const rows = filtered.map(r => [
    r.id,
    r.eventTitle,
    r.department,
    r.organization,
    r.numberOfAttendees ?? '',
    r.contactPerson,
    r.contactEmail,
    r.contactNumber,
    r.status,
    formatSlots(r.reservedDates),
    formatEquipment(r.requestedEquipment),
    formatReadableDate(r.coordinationDate),
    formatCoordinationTime(r.coordinationStartTime, r.coordinationEndTime),
    r.additionalInstructions ?? '',
    formatReadableDateTime(r.createdAt),
    formatReadableDateTime(r.approvedAt),
    r.approvedBy ?? '',
  ]);
  const suffix = `${range.startDate}_to_${range.endDate}`;
  downloadCsv(`gymnasium-reservations-${suffix}.csv`, headers, rows);
}

export function exportVanReservationsCsv(
  records: Array<{
    id: number;
    travelDestination: string;
    department: string;
    organization: string;
    passengerNames: string;
    numberOfPassengers: number | null;
    returnTime: string | null;
    contactPerson: string;
    contactEmail: string;
    contactNumber: string;
    status: string;
    reservedDates: string;
    vehicleLabel: string | null;
    driverName: string | null;
    createdAt: string;
    approvedAt?: string | null;
    approvedBy?: string | null;
    additionalRemarks?: string | null;
  }>,
  range: ExportDateRange,
): void {
  const filtered = records.filter(r =>
    reservationMatchesExportRange(r.reservedDates, null, r.createdAt, range),
  );
  const headers = [
    'ID', 'Destination', 'Department', 'Organization', 'Passenger Names', 'Number of Passengers',
    'Return Time', 'Contact Person', 'Contact Email', 'Contact Number', 'Status',
    'Reserved Dates', 'Vehicle', 'Driver', 'Additional Remarks', 'Created At', 'Approved Date', 'Approved By',
  ];
  const rows = filtered.map(r => [
    r.id,
    r.travelDestination,
    r.department,
    r.organization,
    r.passengerNames,
    r.numberOfPassengers ?? '',
    formatReadableTime(r.returnTime),
    r.contactPerson,
    r.contactEmail,
    r.contactNumber,
    r.status,
    formatSlots(r.reservedDates),
    r.vehicleLabel ?? '',
    r.driverName ?? '',
    r.additionalRemarks ?? '',
    formatReadableDateTime(r.createdAt),
    formatReadableDateTime(r.approvedAt),
    r.approvedBy ?? '',
  ]);
  const suffix = `${range.startDate}_to_${range.endDate}`;
  downloadCsv(`van-reservations-${suffix}.csv`, headers, rows);
}
