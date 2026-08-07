/** e.g. "09:00" → "9:00 am" */
export function formatTime12(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = hour >= 12 ? 'pm' : 'am';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${period}`;
}

/** @deprecated Use formatTime12 */
export const formatTime24 = formatTime12;

/** e.g. "9:00 am - 5:00 pm" */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime12(start)} - ${formatTime12(end)}`;
}

/** App display zone (LPU Laguna). */
export const APP_TIME_ZONE = 'Asia/Manila';

const DATE_TIME_DISPLAY: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

const DATE_DISPLAY: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

/** True when the string already carries an explicit offset or Z. */
function hasExplicitZone(value: string): boolean {
  return /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
}

/**
 * Normalize API / JDBC timestamps for parsing.
 * Zoneless values (e.g. "2026-08-07 03:45:12.0") are treated as UTC — matching
 * Docker/JVM storage — so Asia/Manila display is +8h, not an 8h drift.
 */
export function parseAppDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const local = new Date(y, m - 1, d);
    return Number.isNaN(local.getTime()) ? null : local;
  }

  let normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  // JDBC often appends ".0" or long nanos
  normalized = normalized.replace(/(\.\d{3})\d+/, '$1').replace(/\.0+$/, '');

  if (!hasExplicitZone(normalized)) {
    normalized += 'Z';
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** e.g. "2026-07-08" → "Wed, Jul 8, 2026" */
export function formatReadableDate(dateStr: string | null | undefined): string {
  if (!dateStr?.trim()) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  const parsed = parseAppDateTime(dateStr);
  if (parsed) {
    return parsed.toLocaleDateString('en-US', DATE_DISPLAY);
  }
  return dateStr;
}

/** e.g. ISO timestamps → "Wed, Jul 8, 2026, 11:45 AM" in Asia/Manila */
export function formatReadableDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return formatReadableDate(trimmed);
  }
  const parsed = parseAppDateTime(trimmed);
  if (parsed) {
    return parsed.toLocaleString('en-US', DATE_TIME_DISPLAY);
  }
  return trimmed;
}

/** Hour ("17") or 24h time ("17:00") → "5:00 pm" */
export function formatReadableTime(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  if (/^\d{1,2}$/.test(trimmed)) {
    return formatTime12(`${trimmed.padStart(2, '0')}:00`);
  }
  return formatTime12(trimmed);
}
