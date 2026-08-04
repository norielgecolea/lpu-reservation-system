import { MaintenanceBlock } from '../maintenance/maintenance.service';
import { FLT_ROOM_TYPES } from '../../customer/flt/flt-reservation.models';
import {
  formatReadableDate,
  formatReadableDateTime,
  formatReadableTime,
  formatTime12,
  formatTimeRange,
} from '../../../shared/utils/datetime.util';

/** @deprecated Use formatTime12 */
export const formatTime24 = formatTime12;

export { formatReadableDate, formatReadableDateTime, formatReadableTime, formatTime12, formatTimeRange };

export type DashboardService =
  | 'FLT'
  | 'VAN'
  | 'Gymnasium'
  | 'Boardroom'
  | 'Nexus'
  | 'Conference';

/** @deprecated Use DashboardService */
export type DashboardFacility = DashboardService;

export interface DashboardEquipmentItem {
  id: number;
  name: string;
}

export interface DashboardReservedSlot {
  date: string;
  startTime: string;
  endTime: string;
  time: string;
}

export type DashboardEventKind = 'reservation' | 'coordination' | 'maintenance';

export interface DashboardReservationRecord {
  id: number;
  eventTitle: string;
  department: string;
  organization: string;
  contactPerson: string;
  contactEmail: string;
  contactNumber?: string;
  status: string;
  reservedDates: string;
  requestedEquipment?: string | null;
  coordinationDate: string | null;
  coordinationStartTime: string | null;
  coordinationEndTime: string | null;
  additionalInstructions?: string | null;
  eventType?: string;
  roomType?: string | null;
  expectedAttendees?: string | null;
  numberOfAttendees?: string | null;
  vehicleLabel?: string | null;
  driverName?: string | null;
  vehicleId?: number | null;
  travelDestination?: string | null;
  passengerNames?: string | null;
  numberOfPassengers?: number | string | null;
  returnTime?: string | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  satisfactionRating?: number | null;
}

export interface DashboardEvent {
  id: string;
  title: string;
  time: string;
  startTime: string;
  endTime: string;
  date: string;
  category: string;
  facility: DashboardService;
  colorClass: string;
  eventKind: DashboardEventKind;
  reservationId: number;
  eventTitle: string;
  department: string;
  organization: string;
  contactPerson: string;
  contactEmail: string;
  contactNumber?: string;
  status: string;
  description?: string;
  eventType?: string;
  roomType?: string | null;
  expectedAttendees?: string | null;
  numberOfAttendees?: string | null;
  reservedSlots: DashboardReservedSlot[];
  requestedEquipment: DashboardEquipmentItem[];
  coordinationDate?: string | null;
  coordinationStartTime?: string | null;
  coordinationEndTime?: string | null;
  coordinationTime?: string | null;
  additionalInstructions?: string | null;
  maintenanceReason?: string;
  travelDestination?: string | null;
  passengerNames?: string | null;
  numberOfPassengers?: number | string | null;
  returnTime?: string | null;
  vehicleLabel?: string | null;
  driverName?: string | null;
}

export interface CalendarReservation {
  id: string;
  title: string;
  time: string;
  category: string;
  colorClass: string;
  event: DashboardEvent;
}

export interface CalendarDay {
  id: string;
  day: number | null;
  isToday: boolean;
  rowTone: 'muted' | 'soft';
  reservations: CalendarReservation[];
}

const DAYS_PER_WEEK = 7;
const MIN_CALENDAR_ROWS = 5;

export const IMPLEMENTED_SERVICES = new Set<DashboardService>(['FLT', 'Gymnasium', 'VAN']);

export const DASHBOARD_SERVICE_FILTER_ORDER: DashboardService[] = [
  'FLT',
  'VAN',
  'Gymnasium',
  'Boardroom',
  'Nexus',
  'Conference',
];

export interface DashboardServiceFilterOption {
  value: DashboardService;
  label: string;
  badge?: string;
  disabled?: boolean;
}

/** Segmented / dropdown options with Coming soon for unimplemented services. */
export function dashboardServiceFilterOptions(
  services: readonly DashboardService[] = DASHBOARD_SERVICE_FILTER_ORDER,
): DashboardServiceFilterOption[] {
  return services.map((service) => {
    const comingSoon = !isServiceImplemented(service);
    return {
      value: service,
      label: comingSoon ? `${service} ` : service,
      badge: comingSoon ? 'Coming Soon' : undefined,
      // Keep selectable so the calendar can show the Coming soon empty state.
      disabled: false,
    };
  });
}

/** Maps auth role service codes (FLT | GYMNASIUM | VAN) → dashboard filter tabs. */
export function dashboardServicesFromRoleCodes(
  codes: readonly string[] | null | undefined,
): DashboardService[] {
  const map: Record<string, DashboardService> = {
    FLT: 'FLT',
    GYMNASIUM: 'Gymnasium',
    VAN: 'VAN',
  };
  const allowed = new Set<DashboardService>();
  for (const code of codes ?? []) {
    const ds = map[(code ?? '').trim().toUpperCase()];
    if (ds) allowed.add(ds);
  }
  return DASHBOARD_SERVICE_FILTER_ORDER.filter(
    (s) => allowed.has(s) && isServiceImplemented(s),
  );
}

export const MAINTENANCE_API_FACILITY: Partial<Record<DashboardService, string>> = {
  FLT: 'FLT',
  Gymnasium: 'GYMNASIUM',
};

export const FLT_EVENT_COLOR =
  'border-sky-500 bg-sky-50 text-sky-900';
export const GYM_EVENT_COLOR =
  'border-emerald-500 bg-emerald-50 text-emerald-900';
export const COORD_EVENT_COLOR =
  'border-amber-500 bg-amber-50 text-amber-950';
export const MAINTENANCE_EVENT_COLOR =
  'border-zinc-500 bg-zinc-100 text-zinc-800';
export const VAN_EVENT_COLOR =
  'border-sky-500 bg-sky-50 text-sky-900';
export const VAN_UNASSIGNED_COLOR =
  'border-zinc-400 bg-zinc-100 text-zinc-800';

/** Distinct calendar colors per assigned van (by vehicle id). */
export const VAN_VEHICLE_COLOR_PALETTE = [
  'border-sky-500 bg-sky-50 text-sky-900',
  'border-sky-500 bg-sky-50 text-sky-900',
  'border-emerald-500 bg-emerald-50 text-emerald-900',
  'border-amber-500 bg-amber-50 text-amber-950',
  'border-rose-500 bg-rose-50 text-rose-900',
  'border-teal-500 bg-teal-50 text-teal-900',
  'border-indigo-500 bg-indigo-50 text-indigo-900',
  'border-orange-500 bg-orange-50 text-orange-900',
] as const;

export function vanColorForVehicleId(vehicleId: number | null | undefined): string {
  if (vehicleId == null) return VAN_UNASSIGNED_COLOR;
  return VAN_VEHICLE_COLOR_PALETTE[vehicleId % VAN_VEHICLE_COLOR_PALETTE.length];
}

export function getVanVehicleLegends(
  records: Array<{ vehicleId?: number | null; vehicleLabel?: string | null; status: string }>,
): Array<{ label: string; className: string }> {
  const seen = new Map<string, { label: string; vehicleId: number | null }>();
  for (const r of records) {
    if (r.status !== 'APPROVED' && r.status !== 'COMPLETED') continue;
    const key = r.vehicleId != null ? String(r.vehicleId) : 'unassigned';
    if (!seen.has(key)) {
      seen.set(key, {
        label: r.vehicleLabel?.trim() || 'Unassigned',
        vehicleId: r.vehicleId ?? null,
      });
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(v => ({
      label: v.label,
      className: vanColorForVehicleId(v.vehicleId),
    }));
}
export const BOARDROOM_EVENT_COLOR =
  'border-amber-500 bg-amber-50 text-amber-950';
export const NEXUS_EVENT_COLOR =
  'border-violet-500 bg-violet-50 text-violet-900';
export const CONFERENCE_EVENT_COLOR =
  'border-rose-500 bg-rose-50 text-rose-900';

export const SERVICE_EVENT_COLORS: Record<DashboardService, string> = {
  FLT: FLT_EVENT_COLOR,
  VAN: VAN_EVENT_COLOR,
  Gymnasium: GYM_EVENT_COLOR,
  Boardroom: BOARDROOM_EVENT_COLOR,
  Nexus: NEXUS_EVENT_COLOR,
  Conference: CONFERENCE_EVENT_COLOR,
};

export type DashboardStatKind = 'total' | 'pending' | 'approved' | 'rejected';

/** Unified stat card colors — same across every service tab. */
const DASHBOARD_STAT_BGS: Record<DashboardStatKind, string> = {
  total: 'bg-primary',
  pending: 'bg-amber-500',
  approved: 'bg-emerald-600',
  rejected: 'bg-rose-600',
};

export function dashboardStatCardBg(
  _service: DashboardService,
  kind: DashboardStatKind,
): string {
  return DASHBOARD_STAT_BGS[kind];
}

const SERVICE_APPROVER_SLUG: Partial<Record<DashboardService, 'flt' | 'gymnasium' | 'van'>> = {
  FLT: 'flt',
  Gymnasium: 'gymnasium',
  VAN: 'van',
};

/** Maps dashboard stat card → approver status filter query value. */
export function dashboardStatStatusParam(kind: DashboardStatKind): string {
  switch (kind) {
    case 'total':
      return 'All';
    case 'pending':
      return 'PENDING';
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
  }
}

/** Approver list route + query for a dashboard stat card, or null when service is not live. */
export function dashboardApproverRoute(
  service: DashboardService,
  kind: DashboardStatKind,
  month: string,
  context: 'admin' | 'facilities' | 'flt-tech' = 'admin',
): { routerLink: string; queryParams: { status: string; month: string } } | null {
  const slug = SERVICE_APPROVER_SLUG[service];
  if (!slug || !isServiceImplemented(service)) return null;
  const prefix =
    context === 'facilities' ? '/facilities' : context === 'flt-tech' ? '/flt-tech' : '';
  return {
    routerLink: `${prefix}/reservation/${slug}`,
    queryParams: {
      status: dashboardStatStatusParam(kind),
      month,
    },
  };
}

export function isServiceImplemented(service: DashboardService): boolean {
  return IMPLEMENTED_SERVICES.has(service);
}

export function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseIsoDateKey(dateStr: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!iso) return null;
  const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "2026-07-08" → "Jul" */
export function formatEventMonth(dateStr: string): string {
  const d = parseIsoDateKey(dateStr);
  return d ? d.toLocaleDateString('en-US', { month: 'short' }) : dateStr;
}

/** e.g. "2026-07-08" → "8" */
export function formatEventDay(dateStr: string): string {
  const d = parseIsoDateKey(dateStr);
  return d ? String(d.getDate()) : dateStr;
}

export function dashboardEventKindLabel(kind: DashboardEventKind): string {
  switch (kind) {
    case 'coordination':
      return 'Coordination';
    case 'maintenance':
      return 'Maintenance';
    default:
      return 'Event';
  }
}

export function dashboardEventKindIcon(kind: DashboardEventKind): string {
  switch (kind) {
    case 'coordination':
      return 'handshake';
    case 'maintenance':
      return 'construction';
    default:
      return 'event';
  }
}

/** Solid date-circle colors matching calendar legend kinds. */
export function dashboardEventDateBadgeClass(
  event: Pick<DashboardEvent, 'eventKind' | 'facility'>,
): string {
  if (event.eventKind === 'coordination') return 'bg-amber-500 text-white';
  if (event.eventKind === 'maintenance') return 'bg-zinc-600 text-white';
  if (event.facility === 'Gymnasium') return 'bg-emerald-600 text-white';
  return 'bg-sky-600 text-white';
}

/** Compact kind chip for upcoming / day lists. */
export function dashboardEventKindBadgeClass(
  kind: DashboardEventKind,
  facility?: DashboardService,
): string {
  switch (kind) {
    case 'coordination':
      return 'bg-amber-100 text-amber-900 ring-amber-200/80';
    case 'maintenance':
      return 'bg-zinc-200 text-zinc-800 ring-zinc-300/80';
    default:
      if (facility === 'Gymnasium') {
        return 'bg-emerald-100 text-emerald-900 ring-emerald-200/80';
      }
      return 'bg-sky-100 text-sky-900 ring-sky-200/80';
  }
}

/** Title without [Coord]/[Maint] prefixes when a kind badge is shown. */
export function dashboardEventDisplayTitle(event: DashboardEvent): string {
  if (event.eventKind === 'coordination') {
    return (
      event.eventTitle ||
      event.organization ||
      event.title.replace(/^\[Coord\]\s*/i, '')
    );
  }
  if (event.eventKind === 'maintenance') {
    return (
      event.maintenanceReason ||
      event.eventTitle ||
      event.title.replace(/^\[Maint\]\s*/i, '')
    );
  }
  return event.title;
}

export function parseReservedDates(
  json: string,
): Array<{ date: string; startTime: string; endTime: string }> {
  try {
    return JSON.parse(json) ?? [];
  } catch {
    return [];
  }
}

export function parseEquipment(json: string | null | undefined): DashboardEquipmentItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toReservedSlots(json: string): DashboardReservedSlot[] {
  return parseReservedDates(json).map(s => ({
    ...s,
    time: formatTimeRange(s.startTime, s.endTime),
  }));
}

function eventDescription(rec: DashboardReservationRecord, _facility: DashboardService): string {
  if (rec.additionalInstructions?.trim()) {
    return rec.additionalInstructions.trim();
  }
  if (rec.eventType) {
    return `${rec.eventTitle} — ${rec.eventType}`;
  }
  return rec.eventTitle;
}

function truncateText(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function recordContext(rec: DashboardReservationRecord, facility: DashboardService, category: string) {
  const reservedSlots = toReservedSlots(rec.reservedDates);
  const coordinationTime =
    rec.coordinationDate && rec.coordinationStartTime && rec.coordinationEndTime
      ? formatTimeRange(rec.coordinationStartTime, rec.coordinationEndTime)
      : null;

  return {
    category,
    facility,
    reservationId: rec.id,
    eventTitle: rec.eventTitle,
    department: rec.department,
    organization: rec.organization,
    contactPerson: rec.contactPerson,
    contactEmail: rec.contactEmail,
    contactNumber: rec.contactNumber,
    status: rec.status,
    eventType: rec.eventType,
    roomType: rec.roomType,
    expectedAttendees: rec.expectedAttendees,
    numberOfAttendees: rec.numberOfAttendees,
    reservedSlots,
    requestedEquipment: parseEquipment(rec.requestedEquipment),
    coordinationDate: rec.coordinationDate,
    coordinationStartTime: rec.coordinationStartTime,
    coordinationEndTime: rec.coordinationEndTime,
    coordinationTime,
    additionalInstructions: rec.additionalInstructions,
    travelDestination: rec.travelDestination ?? null,
    passengerNames: rec.passengerNames ?? null,
    numberOfPassengers: rec.numberOfPassengers ?? null,
    returnTime: rec.returnTime ?? null,
    vehicleLabel: rec.vehicleLabel ?? null,
    driverName: rec.driverName ?? null,
  };
}

/** Build a dashboard summary event from any reservation row (approver table, etc.). */
export function reservationRecordToSummaryEvent(
  rec: DashboardReservationRecord,
  facility: DashboardService,
): DashboardEvent {
  const ctx = recordContext(rec, facility, facility);
  const slots = parseReservedDates(rec.reservedDates);
  const primary = slots[0];
  const date = primary?.date ?? '';
  const startTime = primary?.startTime ?? '';
  const endTime = primary?.endTime ?? '';

  return {
    id: `summary-${facility}-${rec.id}`,
    title:
      facility === 'VAN'
        ? rec.travelDestination || rec.eventTitle
        : rec.eventTitle || rec.organization,
    date,
    startTime,
    endTime,
    time: primary ? formatTimeRange(startTime, endTime) : '—',
    colorClass: SERVICE_EVENT_COLORS[facility],
    eventKind: 'reservation',
    description: truncateText(eventDescription(rec, facility)),
    ...ctx,
  };
}

export function recordsToDashboardEvents(
  records: DashboardReservationRecord[],
  facility: DashboardService,
  colorClass: string,
  category: string,
): DashboardEvent[] {
  const events: DashboardEvent[] = [];
  for (const rec of records) {
    if (rec.status !== 'APPROVED' && rec.status !== 'COMPLETED') continue;
    const ctx = recordContext(rec, facility, category);
    const slots = parseReservedDates(rec.reservedDates);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      events.push({
        id: `${facility.toLowerCase()}-${rec.id}-slot-${i}`,
        title: rec.eventTitle || rec.organization,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        time: formatTimeRange(s.startTime, s.endTime),
        colorClass,
        eventKind: 'reservation',
        description: truncateText(eventDescription(rec, facility)),
        ...ctx,
      });
    }
    if (rec.coordinationDate && rec.coordinationStartTime && rec.coordinationEndTime) {
      events.push({
        id: `${facility.toLowerCase()}-coord-${rec.id}`,
        title: `[Coord] ${rec.eventTitle || rec.organization}`,
        date: rec.coordinationDate,
        startTime: rec.coordinationStartTime,
        endTime: rec.coordinationEndTime,
        time: formatTimeRange(rec.coordinationStartTime, rec.coordinationEndTime),
        colorClass: COORD_EVENT_COLOR,
        eventKind: 'coordination',
        description: truncateText(eventDescription(rec, facility)),
        ...ctx,
      });
    }
  }
  return events;
}

export function maintenanceBlocksToDashboardEvents(
  blocks: MaintenanceBlock[],
  facility: DashboardService,
): DashboardEvent[] {
  return blocks.map(block => ({
    id: `maint-${block.id}`,
    title: `[Maint] ${block.reason || 'Maintenance'}`,
    date: block.blockDate,
    startTime: block.startTime,
    endTime: block.endTime,
    time: formatTimeRange(block.startTime, block.endTime),
    category: facility,
    facility,
    colorClass: MAINTENANCE_EVENT_COLOR,
    eventKind: 'maintenance' as const,
    reservationId: block.id,
    eventTitle: block.reason || 'Maintenance Block',
    department: '—',
    organization: 'Facilities Maintenance',
    contactPerson: '—',
    contactEmail: '—',
    status: 'SCHEDULED',
    description: block.reason || 'Scheduled maintenance',
    reservedSlots: [],
    requestedEquipment: [],
    maintenanceReason: block.reason,
  }));
}

export function buildServiceCalendarEvents(
  records: DashboardReservationRecord[],
  maintenanceBlocks: MaintenanceBlock[],
  service: DashboardService,
): DashboardEvent[] {
  if (!isServiceImplemented(service)) return [];
  if (service === 'VAN') {
    return buildVanCalendarEvents(records);
  }
  const reservationEvents = recordsToDashboardEvents(
    records,
    service,
    SERVICE_EVENT_COLORS[service],
    service,
  );
  return [...reservationEvents, ...maintenanceBlocksToDashboardEvents(maintenanceBlocks, service)];
}

/** Van dashboard: one calendar chip per trip slot, color-coded by assigned van. */
export function buildVanCalendarEvents(records: DashboardReservationRecord[]): DashboardEvent[] {
  const events: DashboardEvent[] = [];
  for (const rec of records) {
    if (rec.status !== 'APPROVED' && rec.status !== 'COMPLETED') continue;
    const slots = parseReservedDates(rec.reservedDates);
    const vehicle = rec.vehicleLabel?.trim() || 'Unassigned';
    const driver = rec.driverName?.trim() || 'No driver';
    const colorClass = vanColorForVehicleId(rec.vehicleId);
    const ctx = {
      category: 'VAN',
      facility: 'VAN' as DashboardService,
      reservationId: rec.id,
      eventTitle: rec.eventTitle,
      department: rec.department,
      organization: rec.organization,
      contactPerson: rec.contactPerson,
      contactEmail: rec.contactEmail,
      contactNumber: rec.contactNumber,
      status: rec.status,
      travelDestination: rec.travelDestination ?? rec.eventTitle,
      passengerNames: rec.passengerNames ?? null,
      numberOfPassengers: rec.numberOfPassengers ?? null,
      returnTime: rec.returnTime ?? null,
      vehicleLabel: rec.vehicleLabel ?? null,
      driverName: rec.driverName ?? null,
      reservedSlots: parseReservedDates(rec.reservedDates).map(s => ({
        ...s,
        time: formatTimeRange(s.startTime, s.endTime),
      })),
      requestedEquipment: [] as DashboardEquipmentItem[],
      coordinationDate: null,
      coordinationStartTime: null,
      coordinationEndTime: null,
      coordinationTime: null,
      additionalInstructions: rec.additionalInstructions,
    };

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const time = formatTimeRange(s.startTime, s.endTime);
      events.push({
        id: `van-${rec.id}-slot-${i}`,
        title: rec.eventTitle || rec.travelDestination || rec.organization || '—',
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        time,
        colorClass,
        eventKind: 'reservation',
        description: `${vehicle} · ${driver}`,
        ...ctx,
      });
    }
  }
  return events;
}

export function reservationStats(records: DashboardReservationRecord[]) {
  return {
    total: records.length,
    pending: records.filter(r => r.status === 'PENDING').length,
    approved: records.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length,
    rejected: records.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length,
  };
}

function parseYearMonth(value: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const year = match ? Number(match[1]) : new Date().getFullYear();
  const month = match ? Number(match[2]) - 1 : new Date().getMonth();
  if (!Number.isInteger(year) || month < 0 || month > 11) {
    return { year: new Date().getFullYear(), month: new Date().getMonth() };
  }
  return { year, month };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function createCalendarDays(value: string, events: DashboardEvent[]): CalendarDay[] {
  const { year, month } = parseYearMonth(value);
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rowCount = Math.max(
    MIN_CALENDAR_ROWS,
    Math.ceil((firstWeekday + daysInMonth) / DAYS_PER_WEEK),
  );
  const cellCount = rowCount * DAYS_PER_WEEK;

  return Array.from({ length: cellCount }, (_, index) => {
    const row = Math.floor(index / DAYS_PER_WEEK);
    const dayOffset = index - firstWeekday;
    const day = dayOffset >= 0 && dayOffset < daysInMonth ? dayOffset + 1 : null;
    const rowTone: CalendarDay['rowTone'] = row % 2 === 0 ? 'muted' : 'soft';

    return {
      id: `${value}-${index}-${day ?? 'empty'}`,
      day,
      isToday: day === todayDay && month === todayMonth && year === todayYear,
      rowTone,
      reservations:
        day === null
          ? []
          : events
              .filter(event => event.date === formatDateKey(year, month, day))
              .map(event => ({
                id: event.id,
                title: event.title,
                time: event.time,
                category: event.category,
                colorClass: event.colorClass,
                event,
              })),
    };
  });
}

export const ROOM_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FLT_ROOM_TYPES.map(room => [room.value, room.label]),
);

export function getRoomTypeLabel(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const trimmed = value.trim();
  return ROOM_TYPE_LABELS[trimmed] ?? trimmed;
}

/** Map van admin reservation rows to dashboard calendar records. */
export function vanRecordsToDashboardRecords(
  records: Array<{
    id: number;
    travelDestination: string;
    department: string;
    organization: string;
    contactPerson: string;
    contactEmail: string;
    contactNumber: string;
    passengerNames: string;
    numberOfPassengers?: number | null;
    returnTime: string | null;
    reservedDates: string;
    status: string;
    vehicleLabel?: string | null;
    driverName?: string | null;
    vehicleId?: number | null;
    createdAt?: string;
    approvedAt?: string | null;
    satisfactionRating?: number | null;
    additionalRemarks?: string | null;
  }>,
): DashboardReservationRecord[] {
  return records.map(r => ({
    id: r.id,
    eventTitle: r.travelDestination,
    department: r.department,
    organization: r.organization,
    contactPerson: r.contactPerson,
    contactEmail: r.contactEmail,
    contactNumber: r.contactNumber,
    status: r.status,
    reservedDates: r.reservedDates,
    coordinationDate: null,
    coordinationStartTime: null,
    coordinationEndTime: null,
    travelDestination: r.travelDestination,
    passengerNames: r.passengerNames,
    numberOfPassengers: r.numberOfPassengers ?? null,
    returnTime: r.returnTime,
    vehicleLabel: r.vehicleLabel,
    driverName: r.driverName,
    vehicleId: r.vehicleId ?? null,
    additionalInstructions: r.additionalRemarks ?? null,
    createdAt: r.createdAt ?? null,
    approvedAt: r.approvedAt ?? null,
    satisfactionRating: r.satisfactionRating ?? null,
  }));
}
