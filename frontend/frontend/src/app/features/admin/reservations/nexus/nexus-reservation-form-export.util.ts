import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

import { DashboardEvent } from '../../dashboard/dashboard-events.util';
import { EXTERNAL_DEPARTMENT } from '../../../../shared/constants/department-options';
import { formatTime12 } from '../../../../shared/utils/datetime.util';
import {
  NexusReservationRecord,
  RequestedEquipmentItem,
  ReservedDateSlot,
} from './nexus-reservations.models';

/** Blank PDF exported from the official IFERF DOCX (LPUL & LPU-SC). */
const TEMPLATE_URL = '/templates/IFERF-LPUL-LPUSC.pdf';

/** pdf-lib coords (origin bottom-left). Page size 612×936 (legal-ish). */
const PAGE_H = 936;

const FIELD = {
  internalCheck: { x: 159.5, y: PAGE_H - 108.6 + 1.2 },
  externalCheck: { x: 239.0, y: PAGE_H - 108.6 + 1.2 },
  deptOrg: { x: 244.3, y: 814.0 },
  contactPerson: { x: 151.8, y: 799.6 },
  contactNumber: { x: 383.3, y: 799.6 },
  eventName: { x: 149.0, y: 785.2 },
  dateEvent: { x: 145.6, y: 771.0 },
  timeEvent: { x: 416.2, y: 771.0 },
  venue: { x: 178.2, y: 756.6 },
  numParticipants: { x: 160.3, y: 728.1 },
  nexusCheck: { x: 192.5, y: PAGE_H - 257.6 + 1.2 },
  othersFacility: { x: 160.6, y: 641.0 },
  othersEquipment: { x: 160.6, y: PAGE_H - 456.8 + 1.2 },
} as const;

type EquipmentRow = {
  keys: string[];
  check: { x: number; y: number };
  qty: { x: number; y: number };
};

const EQUIPMENT_ROWS: EquipmentRow[] = [
  {
    keys: ['microphone', 'mic'],
    check: { x: 155.1, y: 585.3 },
    qty: { x: 312.6, y: 585.3 },
  },
  {
    keys: ['sound'],
    check: { x: 156.2, y: 570.9 },
    qty: { x: 312.6, y: 570.9 },
  },
  {
    keys: ['lcd', 'projector'],
    check: { x: 156.8, y: 556.7 },
    qty: { x: 312.6, y: 556.7 },
  },
  {
    keys: ['chair'],
    check: { x: 155.8, y: 542.3 },
    qty: { x: 312.6, y: 542.3 },
  },
  {
    keys: ['table'],
    check: { x: 156.1, y: 526.0 },
    qty: { x: 312.6, y: 526.0 },
  },
  {
    keys: ['extension', 'cord'],
    check: { x: 157.4, y: 510.2 },
    qty: { x: 312.6, y: 510.2 },
  },
];

function parseDates(json: string): ReservedDateSlot[] {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function parseEquipment(json: string | null | undefined): RequestedEquipmentItem[] {
  if (!json) return [];
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function formatEventDates(slots: ReservedDateSlot[]): string {
  const dates = [...new Set(slots.map((s) => s.date).filter(Boolean))];
  return dates.join(', ');
}

function formatEventTimes(slots: ReservedDateSlot[]): string {
  if (!slots.length) return '';
  return slots
    .map((s) => `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`)
    .join(', ');
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'event'
  );
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

function drawCheck(page: PDFPage, font: PDFFont, x: number, y: number): void {
  page.drawText('X', {
    x,
    y,
    size: 9,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
}

function matchEquipmentRow(name: string): EquipmentRow | null {
  const lower = name.toLowerCase();
  return EQUIPMENT_ROWS.find((row) => row.keys.some((k) => lower.includes(k))) ?? null;
}

function fillPage(page: PDFPage, font: PDFFont, row: NexusReservationRecord): void {
  const slots = parseDates(row.reservedDates);
  const equipment = parseEquipment(row.requestedEquipment);
  const deptOrg = [row.department, row.organization].filter(Boolean).join(' / ');
  const isExternal = (row.department ?? '').trim().toUpperCase() === EXTERNAL_DEPARTMENT;

  drawCheck(page, font, isExternal ? FIELD.externalCheck.x : FIELD.internalCheck.x, FIELD.internalCheck.y);
  drawText(page, font, deptOrg, FIELD.deptOrg.x, FIELD.deptOrg.y, 9, 300);
  drawText(page, font, row.contactPerson ?? '', FIELD.contactPerson.x, FIELD.contactPerson.y, 9, 170);
  drawText(page, font, row.contactNumber ?? '', FIELD.contactNumber.x, FIELD.contactNumber.y, 9, 140);
  drawText(page, font, row.eventTitle ?? '', FIELD.eventName.x, FIELD.eventName.y, 9, 380);
  drawText(page, font, formatEventDates(slots), FIELD.dateEvent.x, FIELD.dateEvent.y, 9, 180);
  drawText(page, font, formatEventTimes(slots), FIELD.timeEvent.x, FIELD.timeEvent.y, 9, 160);
  drawText(page, font, 'Nexus Room', FIELD.venue.x, FIELD.venue.y, 9, 300);
  drawText(
    page,
    font,
    row.numberOfAttendees ?? '',
    FIELD.numParticipants.x,
    FIELD.numParticipants.y,
    9,
    200,
  );
  drawCheck(page, font, FIELD.nexusCheck.x, FIELD.nexusCheck.y);

  const unmatched: string[] = [];
  for (const item of equipment) {
    const matched = matchEquipmentRow(item.name ?? '');
    if (!matched) {
      unmatched.push(item.name);
      continue;
    }
    drawCheck(page, font, matched.check.x, matched.check.y);
    drawText(page, font, '1', matched.qty.x, matched.qty.y, 8, 40);
  }

  if (unmatched.length) {
    drawText(
      page,
      font,
      unmatched.join(', '),
      FIELD.othersEquipment.x,
      FIELD.othersEquipment.y,
      8,
      380,
    );
  }

  if (row.additionalInstructions?.trim()) {
    drawText(
      page,
      font,
      row.additionalInstructions,
      FIELD.othersFacility.x,
      FIELD.othersFacility.y,
      8,
      380,
    );
  }
}

/** Fill the official IFERF PDF for a nexus reservation and download it. */
export async function downloadNexusReservationForm(row: NexusReservationRecord): Promise<void> {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('Could not load the facilities reservation form template.');
  }

  const pdfDoc = await PDFDocument.load(await response.arrayBuffer());
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  if (!pages.length) {
    throw new Error('The facilities reservation form template is invalid.');
  }

  // Page 0 ≈ LPU-L approvals, page 1 ≈ LPU-SC approvals — fill both.
  for (const page of pages) {
    fillPage(page, font, row);
  }

  const out = await pdfDoc.save();
  const bytes = new Uint8Array(out.byteLength);
  bytes.set(out);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `IFERF-Nexus Room-${slugify(row.organization)}-${slugify(row.eventTitle)}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Build a gym form row from a dashboard summary event. */
export function gymFormRowFromDashboardEvent(event: DashboardEvent): NexusReservationRecord {
  const slots: ReservedDateSlot[] = event.reservedSlots.map((slot) => ({
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  return {
    id: event.reservationId,
    eventTitle: event.eventTitle,
    department: event.department,
    organization: event.organization,
    numberOfAttendees: event.numberOfAttendees ?? event.expectedAttendees ?? null,
    contactPerson: event.contactPerson,
    contactEmail: event.contactEmail,
    contactNumber: event.contactNumber ?? '',
    reservedDates: JSON.stringify(slots),
    requestedEquipment: JSON.stringify(event.requestedEquipment ?? []),
    coordinationDate: event.coordinationDate ?? null,
    coordinationStartTime: event.coordinationStartTime ?? null,
    coordinationEndTime: event.coordinationEndTime ?? null,
    additionalInstructions: event.additionalInstructions ?? null,
    status: event.status as NexusReservationRecord['status'],
    createdAt: '',
    satisfactionRating: null,
    approvedAt: null,
    approvedBy: null,
  };
}

export async function downloadNexusReservationFormFromEvent(
  event: DashboardEvent,
): Promise<void> {
  return downloadNexusReservationForm(gymFormRowFromDashboardEvent(event));
}
