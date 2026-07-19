export const VEHICLE_STATUS_OPTIONS = [
  { label: 'AVAILABLE', value: 'AVAILABLE' },
  { label: 'UNAVAILABLE', value: 'UNAVAILABLE' },
] as const;

export function normalizeVehicleStatus(status: string | null | undefined): string {
  const value = status?.trim() ?? '';
  const lower = value.toLowerCase();

  if (lower === 'available') {
    return 'AVAILABLE';
  }

  if (lower === 'unavailable') {
    return 'UNAVAILABLE';
  }

  return value;
}
