import { formatReadableDateTime } from '../../../shared/utils/datetime.util';
import { downloadCsv, ExportDateRange } from '../reservations/reservation-export.util';

import { AuditLogRow } from './audit-logs.models';

function matchesDateRange(performedAt: string, range: ExportDateRange): boolean {
  const start = range.startDate ?? '';
  const end = range.endDate ?? '';
  if (!start || !end) return false;

  // performedAt is an ISO-like timestamp: yyyy-MM-ddTHH:mm:ss
  const date = performedAt?.slice(0, 10) ?? '';
  return date >= start && date <= end;
}

export function exportAuditLogsCsv(
  records: AuditLogRow[],
  range: ExportDateRange,
  serviceLabel: string,
): void {
  const filtered = records.filter(r => !!r.performedAt && matchesDateRange(r.performedAt, range));

  const headers = [
    'ID',
    'Service',
    'Action Type',
    'Admin Username',
    'Admin Fullname',
    'Target Type',
    'Target ID',
    'Target Label',
    'Performed At',
    'Details',
  ];

  const rows = filtered.map(r => [
    r.id,
    r.service,
    r.actionType,
    r.adminUsername,
    r.adminFullname ?? '',
    r.targetType ?? '',
    r.targetId ?? '',
    r.targetLabel ?? '',
    formatReadableDateTime(r.performedAt),
    r.details ?? '',
  ]);

  const suffix = `${range.startDate}_to_${range.endDate}`;
  const slug = serviceLabel.toLowerCase().replace(/\s+/g, '-');
  downloadCsv(`audit-${slug}-${suffix}.csv`, headers, rows);
}
