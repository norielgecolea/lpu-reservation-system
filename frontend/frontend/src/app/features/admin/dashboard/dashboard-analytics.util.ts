import { MaintenanceBlock } from '../maintenance/maintenance.service';
import {
  DashboardEvent,
  DashboardEventKind,
  DashboardReservationRecord,
  DashboardService,
  getRoomTypeLabel,
  parseEquipment,
  parseReservedDates,
} from './dashboard-events.util';

export interface RankedItem {
  label: string;
  count: number;
  percent: number;
}

export interface WeekBucket {
  label: string;
  count: number;
  percent: number;
}

export interface DayCount {
  date: string;
  day: number;
  count: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  percent: number;
}

export interface EventMixItem {
  kind: DashboardEventKind;
  label: string;
  count: number;
  percent: number;
}

export interface AllTimeSummary {
  total: number;
  approvalRate: number | null;
  avgTurnaroundHours: number | null;
}

export interface MonthAnalytics {
  total: number;
  statusBreakdown: StatusBreakdownItem[];
  topDepartments: RankedItem[];
  weeklyActivity: WeekBucket[];
  busiestDays: DayCount[];
  eventMix: EventMixItem[];
}

export interface FltSpecificAnalytics {
  kind: 'FLT';
  roomTypeSplit: RankedItem[];
  eventTypeSplit: RankedItem[];
  equipmentDemand: RankedItem[];
  avgExpectedAttendees: number | null;
}

export interface GymSpecificAnalytics {
  kind: 'Gymnasium';
  avgAttendees: number | null;
  equipmentDemand: RankedItem[];
  maintenanceBlockCount: number;
  maintenanceBlockedHours: number;
}

export interface VanSpecificAnalytics {
  kind: 'VAN';
  topDestinations: RankedItem[];
  vehicleUtilization: RankedItem[];
  totalPassengers: number;
  avgPassengers: number | null;
  driverActivity: RankedItem[];
}

export interface EmptySpecificAnalytics {
  kind: 'empty';
}

export type FacilitySpecificAnalytics =
  | FltSpecificAnalytics
  | GymSpecificAnalytics
  | VanSpecificAnalytics
  | EmptySpecificAnalytics;

export interface DashboardAnalytics {
  allTime: AllTimeSummary;
  month: MonthAnalytics;
  facilitySpecific: FacilitySpecificAnalytics;
}

const STATUS_ORDER = ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'CONFLICT'] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CONFLICT: 'Conflict',
};

const EVENT_KIND_LABELS: Record<DashboardEventKind, string> = {
  reservation: 'Reservations',
  coordination: 'Coordination',
  maintenance: 'Maintenance',
};

export function filterRecordsByMonth(
  records: DashboardReservationRecord[],
  yearMonth: string,
): DashboardReservationRecord[] {
  const prefix = `${yearMonth}-`;
  return records.filter(rec =>
    parseReservedDates(rec.reservedDates).some(slot => slot.date.startsWith(prefix)),
  );
}

export function filterEventsByMonth(events: DashboardEvent[], yearMonth: string): DashboardEvent[] {
  return events.filter(e => e.date.startsWith(`${yearMonth}-`));
}

function toPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function topNByField(
  records: DashboardReservationRecord[],
  field: keyof DashboardReservationRecord,
  limit: number,
  labelFn?: (value: string) => string,
): RankedItem[] {
  const counts = new Map<string, number>();
  for (const rec of records) {
    const raw = rec[field];
    const value = raw != null && String(raw).trim() ? String(raw).trim() : '—';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const total = records.length;
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({
      label: labelFn ? labelFn(label) : label,
      count,
      percent: toPercent(count, total),
    }));
}

function countByStatus(records: DashboardReservationRecord[]): StatusBreakdownItem[] {
  const total = records.length;
  const counts = new Map<string, number>();
  for (const rec of records) {
    counts.set(rec.status, (counts.get(rec.status) ?? 0) + 1);
  }
  return STATUS_ORDER.filter(s => (counts.get(s) ?? 0) > 0).map(status => {
    const count = counts.get(status) ?? 0;
    return {
      status,
      count,
      percent: toPercent(count, total),
    };
  });
}

function weeklyBookingCounts(
  records: DashboardReservationRecord[],
  yearMonth: string,
): WeekBucket[] {
  const prefix = `${yearMonth}-`;
  const weekCounts = [0, 0, 0, 0, 0];
  for (const rec of records) {
    for (const slot of parseReservedDates(rec.reservedDates)) {
      if (!slot.date.startsWith(prefix)) continue;
      const day = Number(slot.date.slice(8, 10));
      if (!Number.isFinite(day) || day < 1) continue;
      const weekIndex = Math.min(Math.floor((day - 1) / 7), 4);
      weekCounts[weekIndex]++;
    }
  }
  const total = weekCounts.reduce((sum, c) => sum + c, 0);
  return weekCounts.map((count, i) => ({
    label: `W${i + 1}`,
    count,
    percent: toPercent(count, total),
  }));
}

function busiestDays(events: DashboardEvent[], yearMonth: string, limit: number): DayCount[] {
  const counts = new Map<string, number>();
  for (const event of filterEventsByMonth(events, yearMonth)) {
    counts.set(event.date, (counts.get(event.date) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([date, count]) => ({
      date,
      day: Number(date.slice(8, 10)),
      count,
    }));
}

function eventMix(events: DashboardEvent[], yearMonth: string): EventMixItem[] {
  const monthEvents = filterEventsByMonth(events, yearMonth);
  const total = monthEvents.length;
  const counts = new Map<DashboardEventKind, number>();
  for (const event of monthEvents) {
    counts.set(event.eventKind, (counts.get(event.eventKind) ?? 0) + 1);
  }
  const kinds: DashboardEventKind[] = ['reservation', 'coordination', 'maintenance'];
  return kinds
    .filter(k => (counts.get(k) ?? 0) > 0)
    .map(kind => {
      const count = counts.get(kind) ?? 0;
      return {
        kind,
        label: EVENT_KIND_LABELS[kind],
        count,
        percent: toPercent(count, total),
      };
    });
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const parsed = new Date(trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function avgApprovalTurnaroundHours(
  records: DashboardReservationRecord[],
): number | null {
  const hours: number[] = [];
  for (const rec of records) {
    const created = parseTimestamp(rec.createdAt);
    const approved = parseTimestamp(rec.approvedAt);
    if (created == null || approved == null || approved < created) continue;
    hours.push((approved - created) / (1000 * 60 * 60));
  }
  if (!hours.length) return null;
  return Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
}

export function formatTurnaround(hours: number | null): string {
  if (hours == null) return '—';
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} min`;
  }
  return `${Math.round(hours * 10) / 10}h`;
}

function approvalRate(records: DashboardReservationRecord[]): number | null {
  const approved = records.filter(
    r => r.status === 'APPROVED' || r.status === 'COMPLETED',
  ).length;
  const decided = records.filter(
    r =>
      r.status === 'APPROVED' ||
      r.status === 'COMPLETED' ||
      r.status === 'REJECTED' ||
      r.status === 'CANCELLED',
  ).length;
  if (decided <= 0) return null;
  return Math.round((approved / decided) * 100);
}

function parseEquipmentDemand(records: DashboardReservationRecord[], limit: number): RankedItem[] {
  const counts = new Map<string, number>();
  for (const rec of records) {
    for (const item of parseEquipment(rec.requestedEquipment)) {
      const name = item.name?.trim() || 'Unknown';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      percent: toPercent(count, total),
    }));
}

function parseNumericAttendees(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function avgNumericField(
  records: DashboardReservationRecord[],
  field: 'expectedAttendees' | 'numberOfAttendees',
): number | null {
  const values = records
    .map(r => parseNumericAttendees(r[field]))
    .filter((v): v is number => v != null);
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function maintenanceBlockedHours(blocks: MaintenanceBlock[], yearMonth: string): number {
  const prefix = `${yearMonth}-`;
  let totalMinutes = 0;
  for (const block of blocks) {
    if (!block.blockDate.startsWith(prefix)) continue;
    totalMinutes += Math.max(0, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
  }
  return Math.round((totalMinutes / 60) * 10) / 10;
}

function buildFltSpecific(monthRecords: DashboardReservationRecord[]): FltSpecificAnalytics {
  return {
    kind: 'FLT',
    roomTypeSplit: topNByField(monthRecords, 'roomType', 5, getRoomTypeLabel),
    eventTypeSplit: topNByField(monthRecords, 'eventType', 5),
    equipmentDemand: parseEquipmentDemand(monthRecords, 5),
    avgExpectedAttendees: avgNumericField(monthRecords, 'expectedAttendees'),
  };
}

function buildGymSpecific(
  monthRecords: DashboardReservationRecord[],
  maintenance: MaintenanceBlock[],
  yearMonth: string,
): GymSpecificAnalytics {
  const monthBlocks = maintenance.filter(b => b.blockDate.startsWith(`${yearMonth}-`));
  return {
    kind: 'Gymnasium',
    avgAttendees: avgNumericField(monthRecords, 'numberOfAttendees'),
    equipmentDemand: parseEquipmentDemand(monthRecords, 5),
    maintenanceBlockCount: monthBlocks.length,
    maintenanceBlockedHours: maintenanceBlockedHours(maintenance, yearMonth),
  };
}

function buildVanSpecific(monthRecords: DashboardReservationRecord[]): VanSpecificAnalytics {
  const passengerValues = monthRecords
    .map(r => {
      const raw = r.numberOfPassengers;
      if (raw == null) return null;
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      return Number.isFinite(n) ? n : null;
    })
    .filter((v): v is number => v != null);

  return {
    kind: 'VAN',
    topDestinations: topNByField(monthRecords, 'travelDestination', 5),
    vehicleUtilization: topNByField(monthRecords, 'vehicleLabel', 5, v =>
      v === '—' ? 'Unassigned' : v,
    ),
    totalPassengers: passengerValues.reduce((a, b) => a + b, 0),
    avgPassengers: passengerValues.length
      ? Math.round(
          (passengerValues.reduce((a, b) => a + b, 0) / passengerValues.length) * 10,
        ) / 10
      : null,
    driverActivity: topNByField(monthRecords, 'driverName', 5, v =>
      v === '—' ? 'Unassigned' : v,
    ),
  };
}

function buildFacilitySpecific(
  service: DashboardService,
  monthRecords: DashboardReservationRecord[],
  maintenance: MaintenanceBlock[],
  yearMonth: string,
): FacilitySpecificAnalytics {
  switch (service) {
    case 'FLT':
      return buildFltSpecific(monthRecords);
    case 'Gymnasium':
      return buildGymSpecific(monthRecords, maintenance, yearMonth);
    case 'VAN':
      return buildVanSpecific(monthRecords);
    default:
      return { kind: 'empty' };
  }
}

export function buildDashboardAnalytics(
  records: DashboardReservationRecord[],
  events: DashboardEvent[],
  maintenance: MaintenanceBlock[],
  service: DashboardService,
  yearMonth: string,
): DashboardAnalytics {
  const monthRecords = filterRecordsByMonth(records, yearMonth);

  return {
    allTime: {
      total: records.length,
      approvalRate: approvalRate(records),
      avgTurnaroundHours: avgApprovalTurnaroundHours(records),
    },
    month: {
      total: monthRecords.length,
      statusBreakdown: countByStatus(monthRecords),
      topDepartments: topNByField(monthRecords, 'department', 5),
      weeklyActivity: weeklyBookingCounts(monthRecords, yearMonth),
      busiestDays: busiestDays(events, yearMonth, 5),
      eventMix: eventMix(events, yearMonth),
    },
    facilitySpecific: buildFacilitySpecific(service, monthRecords, maintenance, yearMonth),
  };
}

export function formatMonthLabel(yearMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return yearMonth;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusBarClass(status: string): string {
  const classes: Record<string, string> = {
    PENDING: 'bg-linear-to-r from-amber-400 to-amber-600',
    APPROVED: 'bg-linear-to-r from-sky-400 to-sky-600',
    COMPLETED: 'bg-linear-to-r from-emerald-400 to-emerald-600',
    REJECTED: 'bg-linear-to-r from-rose-400 to-rose-600',
    CANCELLED: 'bg-linear-to-r from-zinc-400 to-zinc-500',
    CONFLICT: 'bg-linear-to-r from-orange-400 to-orange-600',
  };
  return classes[status] ?? 'bg-linear-to-r from-primary to-secondary';
}

export function eventMixBarClass(kind: DashboardEventKind): string {
  const classes: Record<DashboardEventKind, string> = {
    reservation: 'bg-linear-to-r from-sky-400 to-sky-600',
    coordination: 'bg-linear-to-r from-amber-400 to-amber-600',
    maintenance: 'bg-linear-to-r from-zinc-400 to-zinc-600',
  };
  return classes[kind];
}
