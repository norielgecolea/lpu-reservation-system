import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

import { DashboardEvent } from '../../dashboard/dashboard-events.util';
import { formatReadableDate, formatTime12 } from '../../../../shared/utils/datetime.util';
import { ReservedDateSlot, VanReservationRow } from './van-reservations.models';

/**
 * Blank PDFs are exported from the official DOCX templates:
 *   public/templates/FM-LPU-*-FMO-07-VRF.docx
 * so labels are real vector text (better alignment than the scanned PDFs).
 */
const TEMPLATE_BY_SCHOOL: Record<'LPU-L' | 'LPU-SC', string> = {
  'LPU-L': '/templates/FM-LPU-L-FMO-07-VRF.pdf',
  'LPU-SC': '/templates/FM-LPU-SC-FMO-07-VRF.pdf',
};

type FieldMap = {
  dateFiled: { x: number; y: number };
  deptOrg: { x: number; y: number };
  destination: { x: number; y: number };
  passenger1: { x: number; y: number };
  passenger2: { x: number; y: number };
  departure: { x: number; y: number };
  returnAt: { x: number; y: number };
  vehicleType: { x: number; y: number };
  requestedBy: { x: number; y: number };
  contactNumber: { x: number; y: number };
  remarks: { x: number; y: number };
  driver: { x: number; y: number };
};

/**
 * Field anchors in pdf-lib coordinates (origin bottom-left).
 * Derived from label word positions in the DOCX→PDF export (2 passenger lines).
 */
const FIELD_BY_SCHOOL: Record<'LPU-L' | 'LPU-SC', FieldMap> = {
  'LPU-L': {
    dateFiled: { x: 425.6, y: 688.9 },
    deptOrg: { x: 167.5, y: 675.0 },
    destination: { x: 170.3, y: 660.3 },
    passenger1: { x: 171.0, y: 645.9 },
    passenger2: { x: 171.0, y: 630.7 },
    departure: { x: 171.0, y: 616.7 },
    returnAt: { x: 171.4, y: 602.0 },
    vehicleType: { x: 207.1, y: 587.9 },
    requestedBy: { x: 169.5, y: 567.5 },
    contactNumber: { x: 386.8, y: 567.5 },
    remarks: { x: 171.1, y: 450.1 },
    driver: { x: 171.9, y: 327.0 },
  },
  'LPU-SC': {
    dateFiled: { x: 418.8, y: 699.7 },
    deptOrg: { x: 164.4, y: 689.1 },
    destination: { x: 168.0, y: 677.9 },
    passenger1: { x: 169.7, y: 666.8 },
    passenger2: { x: 169.7, y: 655.1 },
    departure: { x: 167.9, y: 644.3 },
    returnAt: { x: 168.8, y: 633.2 },
    vehicleType: { x: 203.6, y: 621.9 },
    requestedBy: { x: 167.0, y: 602.3 },
    contactNumber: { x: 378.8, y: 602.3 },
    remarks: { x: 169.7, y: 488.3 },
    driver: { x: 168.4, y: 373.3 },
  },
};

function parseDates(json: string): ReservedDateSlot[] {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function formatDateFiled(value: string | null | undefined): string {
  if (!value) return '';
  return formatReadableDate(value) || value;
}

function formatSlotDateTime(slot: ReservedDateSlot | undefined): string {
  if (!slot) return '';
  return `${slot.date} ${formatTime12(slot.startTime)} – ${formatTime12(slot.endTime)}`;
}

/** Join passenger names with commas (newlines / existing commas normalized). */
function formatPassengerNames(value: string | null | undefined): string {
  return (value ?? '')
    .split(/[\r\n,]+/)
    .map((name) => name.trim())
    .filter(Boolean)
    .join(', ');
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'trip'
  );
}

function normalizeSchool(school: string | null | undefined): 'LPU-L' | 'LPU-SC' {
  const s = (school ?? '').trim().toUpperCase();
  return s === 'LPU-SC' || s === 'LPU SC' || s === 'LPUSC' ? 'LPU-SC' : 'LPU-L';
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size = 9,
  maxWidth = 320,
): void {
  const value = (text ?? '').trim();
  if (!value) return;
  const clipped = value.length > 180 ? `${value.slice(0, 177)}...` : value;
  page.drawText(clipped, {
    x,
    y,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
    maxWidth,
    lineHeight: size + 1,
  });
}

/** Fill the official school VRF form (from DOCX) and download as PDF. */
export async function downloadVanReservationForm(row: VanReservationRow): Promise<void> {
  const school = normalizeSchool(row.school);
  const templateUrl = TEMPLATE_BY_SCHOOL[school];
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error('Could not load the vehicle reservation form template.');
  }

  const pdfDoc = await PDFDocument.load(await response.arrayBuffer());
  const page = pdfDoc.getPages()[0];
  if (!page) {
    throw new Error('The vehicle reservation form template is invalid.');
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const field = FIELD_BY_SCHOOL[school];
  const slots = parseDates(row.reservedDates);
  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];
  const deptOrg = [row.department, row.organization].filter(Boolean).join(' / ');
  const passengers = formatPassengerNames(row.passengerNames);

  drawText(page, font, formatDateFiled(row.createdAt), field.dateFiled.x, field.dateFiled.y, 9, 140);
  drawText(page, font, deptOrg, field.deptOrg.x, field.deptOrg.y, 9, 340);
  drawText(page, font, row.travelDestination ?? '', field.destination.x, field.destination.y, 9, 340);
  drawText(page, font, passengers, field.passenger1.x, field.passenger1.y, 9, 340);
  drawText(page, font, formatSlotDateTime(firstSlot), field.departure.x, field.departure.y, 9, 340);
  drawText(
    page,
    font,
    row.returnTime
      ? `${lastSlot?.date ?? firstSlot?.date ?? ''} ${formatTime12(row.returnTime)}`
      : formatSlotDateTime(lastSlot),
    field.returnAt.x,
    field.returnAt.y,
    9,
    300,
  );
  drawText(
    page,
    font,
    row.requestedVehicleType || row.vehicleLabel || '',
    field.vehicleType.x,
    field.vehicleType.y,
    9,
    160,
  );
  drawText(page, font, row.contactPerson ?? '', field.requestedBy.x, field.requestedBy.y, 9, 200);
  drawText(page, font, row.contactNumber ?? '', field.contactNumber.x, field.contactNumber.y, 9, 120);
  drawText(page, font, row.additionalRemarks ?? '', field.remarks.x, field.remarks.y, 9, 400);
  drawText(page, font, row.driverName ?? '', field.driver.x, field.driver.y, 9, 200);

  const out = await pdfDoc.save();
  const bytes = new Uint8Array(out.byteLength);
  bytes.set(out);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `VRF-${school}-${slugify(row.organization)}-${slugify(row.travelDestination)}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Build a van form row from a dashboard summary event. */
export function vanFormRowFromDashboardEvent(event: DashboardEvent): VanReservationRow {
  const slots: ReservedDateSlot[] = event.reservedSlots.map((slot) => ({
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  return {
    id: event.reservationId,
    school: (event as { school?: string }).school ?? 'LPU-L',
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
    requestedVehicleType: null,
  };
}

export async function downloadVanReservationFormFromEvent(event: DashboardEvent): Promise<void> {
  return downloadVanReservationForm(vanFormRowFromDashboardEvent(event));
}
