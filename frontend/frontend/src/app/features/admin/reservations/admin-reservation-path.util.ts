export type AdminReservationService = 'flt' | 'gymnasium' | 'van';

export function isFacilitiesReservationContext(url: string): boolean {
  return url.includes('/facilities/reservation');
}

export function adminReservationListPath(service: AdminReservationService, url: string): string {
  const prefix = isFacilitiesReservationContext(url) ? '/facilities' : '';
  return `${prefix}/reservation/${service}`;
}

export function adminAddReservationPath(service: AdminReservationService, url: string): string {
  return `${adminReservationListPath(service, url)}/new`;
}
