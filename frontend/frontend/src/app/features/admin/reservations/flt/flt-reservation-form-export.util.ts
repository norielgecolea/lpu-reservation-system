import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

import { formatTime12 } from '../../../../shared/utils/datetime.util';
import {
  FltReservationRecord,
  RequestedEquipmentItem,
  ReservedDateSlot,
} from './flt-reservations.models';

/**
 * Blank/official form PDF exported from public/flt-reservation-template.docx
 * (section-break cleanup for LibreOffice). Markers [[field]] are white-boxed
 * then overwritten with reservation values.
 */
const TEMPLATE_URL = '/templates/FLT-Conference-Theater-Reservation-Form.pdf';

type FieldAnchor = {
  page: number;
  x: number;
  y: number;
  size: number;
  whiteW: number;
  whiteH: number;
  maxWidth: number;
};

/** pdf-lib coords (origin bottom-left), measured from DOCX→PDF markers. */
const FIELD: Record<string, FieldAnchor> = {
  eventTitle: { page: 0, x: 172.1, y: 622.6, size: 11, whiteW: 320, whiteH: 14, maxWidth: 360 },
  eventType: { page: 0, x: 108.1, y: 582.2, size: 11, whiteW: 420, whiteH: 14, maxWidth: 420 },
  expectedAttendees: { page: 0, x: 285.5, y: 558.0, size: 11, whiteW: 200, whiteH: 14, maxWidth: 200 },
  eventDate: { page: 0, x: 173.8, y: 533.8, size: 11, whiteW: 340, whiteH: 14, maxWidth: 340 },
  eventTime: { page: 0, x: 246.4, y: 509.6, size: 11, whiteW: 280, whiteH: 14, maxWidth: 280 },
  organizationDept: { page: 0, x: 257.4, y: 485.4, size: 11, whiteW: 280, whiteH: 14, maxWidth: 280 },
  contactPerson: { page: 0, x: 197.7, y: 461.2, size: 11, whiteW: 320, whiteH: 14, maxWidth: 320 },
  contactNumber: { page: 0, x: 205.1, y: 437.0, size: 11, whiteW: 300, whiteH: 14, maxWidth: 300 },
  contactEmail: { page: 0, x: 190.9, y: 412.8, size: 11, whiteW: 320, whiteH: 14, maxWidth: 320 },
  equipment: { page: 0, x: 72.1, y: 336.3, size: 11, whiteW: 460, whiteH: 40, maxWidth: 460 },
  additionalInstructions: { page: 0, x: 72.1, y: 222.1, size: 11, whiteW: 460, whiteH: 50, maxWidth: 460 },
  coordinationDate: { page: 2, x: 108.1, y: 529.2, size: 11, whiteW: 320, whiteH: 14, maxWidth: 320 },
  coordinationTime: { page: 2, x: 108.1, y: 512.9, size: 11, whiteW: 320, whiteH: 14, maxWidth: 320 },
};

function parseDates(json: string): ReservedDateSlot[] {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

function parseEquipment(json: string | null): RequestedEquipmentItem[] {
  if (!json) return [];
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
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

function drawField(
  page: PDFPage,
  font: PDFFont,
  field: FieldAnchor,
  text: string,
): void {
  const value = (text ?? '').trim();
  // Cover [[marker]] / leftover placeholder glyphs.
  page.drawRectangle({
    x: field.x - 1,
    y: field.y - 2,
    width: field.whiteW,
    height: field.whiteH,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
  if (!value) return;

  const clipped = value.length > 400 ? `${value.slice(0, 397)}...` : value;
  page.drawText(clipped, {
    x: field.x,
    y: field.y,
    size: field.size,
    font,
    color: rgb(0.05, 0.05, 0.05),
    maxWidth: field.maxWidth,
    lineHeight: field.size + 2,
  });
}

/** Fill the official FLT Conference Theater form (from DOCX) and download as PDF. */
export async function downloadFltReservationForm(row: FltReservationRecord): Promise<void> {
  if (!row.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) {
    throw new Error('Please set coordination meeting first before downloading.');
  }

  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('Could not load the FLT reservation form template.');
  }

  const pdfDoc = await PDFDocument.load(await response.arrayBuffer());
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const slots = parseDates(row.reservedDates);
  const equipment =
    parseEquipment(row.requestedEquipment)
      .map((e) => e.name)
      .join(', ') || '';
  const slotDates = slots.map((s) => s.date).join(', ');
  const slotTimes = slots
    .map((s) => `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`)
    .join(', ');
  const organizationDept = [row.organization, row.department].filter(Boolean).join(' / ');
  const coordinationTime = `${formatTime12(row.coordinationStartTime)} - ${formatTime12(row.coordinationEndTime)}`;

  const values: Record<string, string> = {
    eventTitle: String(row.eventTitle ?? ''),
    eventType: String(row.eventType ?? ''),
    expectedAttendees: String(row.expectedAttendees ?? ''),
    eventDate: slotDates,
    eventTime: slotTimes,
    organizationDept,
    contactPerson: String(row.contactPerson ?? ''),
    contactNumber: String(row.contactNumber ?? ''),
    contactEmail: String(row.contactEmail ?? ''),
    equipment,
    additionalInstructions: String(row.additionalInstructions ?? ''),
    coordinationDate: String(row.coordinationDate ?? ''),
    coordinationTime,
  };

  for (const [key, field] of Object.entries(FIELD)) {
    const page = pages[field.page];
    if (!page) continue;
    drawField(page, font, field, values[key] ?? '');
  }

  const out = await pdfDoc.save();
  const bytes = new Uint8Array(out.byteLength);
  bytes.set(out);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `FLT-Reservation-Form-${row.id}-${slugify(row.eventTitle)}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
