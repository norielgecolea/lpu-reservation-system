import ExcelJS from 'exceljs';

import { DashboardEvent } from '../../dashboard/dashboard-events.util';
import { ReservedDateSlot, VanReservationRow } from './van-reservations.models';

const TEMPLATE_URL = '/templates/Vehicle-Reservation-Form-PPFO.xlsx';

function parseDates(json: string): ReservedDateSlot[] {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function formatDateFiled(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatSlotDateTime(slot: ReservedDateSlot | undefined): string {
  if (!slot) return '';
  return `${slot.date} ${slot.startTime} – ${slot.endTime}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'trip';
}

/** Fill the PPFO vehicle reservation template and trigger a browser download. */
export async function downloadVanReservationForm(row: VanReservationRow): Promise<void> {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('Could not load the vehicle reservation form template.');
  }

  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('The vehicle reservation form template is invalid.');
  }

  const slots = parseDates(row.reservedDates);
  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];
  const deptOrg = [row.department, row.organization].filter(Boolean).join(' / ');

  sheet.getCell('G9').value = formatDateFiled(row.createdAt);
  sheet.getCell('C10').value = deptOrg;
  sheet.getCell('C11').value = row.travelDestination;
  sheet.getCell('C12').value = row.passengerNames;
  sheet.getCell('C14').value = formatSlotDateTime(firstSlot);
  sheet.getCell('C15').value = row.returnTime || formatSlotDateTime(lastSlot);
  sheet.getCell('C16').value = row.vehicleLabel ?? '';
  sheet.getCell('C18').value = row.contactPerson;
  sheet.getCell('G18').value = row.contactNumber;
  sheet.getCell('B30').value = row.additionalRemarks ?? '';
  sheet.getCell('C42').value = row.driverName ?? '';

  const out = await workbook.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Vehicle-Reservation-${row.organization}-${slugify(row.travelDestination)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Build a van form row from a dashboard summary event. */
export function vanFormRowFromDashboardEvent(event: DashboardEvent): VanReservationRow {
  const slots: ReservedDateSlot[] = event.reservedSlots.map(slot => ({
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  return {
    id: event.reservationId,
    department: event.department,
    organization: event.organization,
    travelDestination: event.travelDestination ?? event.eventTitle,
    passengerNames: event.passengerNames ?? '',
    numberOfPassengers:
      typeof event.numberOfPassengers === 'number' ? event.numberOfPassengers : null,
    returnTime: event.returnTime ?? null,
    contactPerson: event.contactPerson,
    contactEmail: event.contactEmail,
    contactNumber: event.contactNumber ?? '',
    reservedDates: JSON.stringify(slots),
    status: event.status as VanReservationRow['status'],
    createdAt: '',
    satisfactionRating: null,
    vehicleId: null,
    vehicleLabel: event.vehicleLabel ?? null,
    driverId: null,
    driverName: event.driverName ?? null,
    approvedAt: null,
    approvedBy: null,
    additionalRemarks: event.additionalInstructions ?? null,
  };
}

export async function downloadVanReservationFormFromEvent(event: DashboardEvent): Promise<void> {
  return downloadVanReservationForm(vanFormRowFromDashboardEvent(event));
}
