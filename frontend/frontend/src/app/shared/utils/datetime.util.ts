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
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
}

/** e.g. ISO timestamps → "Wed, Jul 8, 2026, 3:45 PM" */
export function formatReadableDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return formatReadableDate(trimmed);
  }
  const parsed = new Date(trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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
