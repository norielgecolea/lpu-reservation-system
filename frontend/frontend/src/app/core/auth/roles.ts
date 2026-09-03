import type { AuthUser, ServiceCode } from './auth.models';

export type { ServiceCode };

/** Canonical role strings returned by the backend JWT /auth/me. */
export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  FACILITIESADMIN: 'FACILITIESADMIN',
  FLTTECH: 'FLTTECH',
  NEXUSADMIN: 'NEXUSADMIN',
  EOADMIN: 'EOADMIN',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const SERVICES = {
  FLT: 'FLT',
  GYMNASIUM: 'GYMNASIUM',
  VAN: 'VAN',
  NEXUS: 'NEXUS',
  BOARDROOM: 'BOARDROOM',
  CONFERENCE: 'CONFERENCE',
} as const;

export const SERVICE_OPTIONS: { code: ServiceCode; label: string }[] = [
  { code: 'FLT', label: 'FLT Theater' },
  { code: 'GYMNASIUM', label: 'Gymnasium' },
  { code: 'VAN', label: 'University Van' },
  { code: 'NEXUS', label: 'Nexus Room' },
  { code: 'BOARDROOM', label: 'Boardroom' },
  { code: 'CONFERENCE', label: 'Conference Room' },
];

export const EO_SERVICE_CODES: ServiceCode[] = ['BOARDROOM', 'CONFERENCE'];
export const PUBLIC_SERVICE_CODES: ServiceCode[] = ['FLT', 'GYMNASIUM', 'VAN', 'NEXUS'];

/** Every bookable service code (SUPERADMIN always receives this set). */
export const ALL_SERVICE_CODES: ServiceCode[] = SERVICE_OPTIONS.map((o) => o.code);

export function normalizeRole(role: string | null | undefined): string {
  return (role ?? '').trim().toUpperCase();
}

export function isFltTech(role: string | null | undefined): boolean {
  return normalizeRole(role) === ROLES.FLTTECH;
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === ROLES.SUPERADMIN;
}

export function isFacilitiesAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === ROLES.FACILITIESADMIN;
}

export function isEoAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === ROLES.EOADMIN;
}

export function isEoService(service: string | null | undefined): boolean {
  const n = (service ?? '').trim().toUpperCase();
  return n === SERVICES.BOARDROOM || n === SERVICES.CONFERENCE;
}

/** Super Admin, EO Admin, or a role allotted Boardroom and/or Conference. */
export function hasEoOfficeAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.role) || isEoAdmin(user.role)) return true;
  return hasService(user, 'BOARDROOM') || hasService(user, 'CONFERENCE');
}

/** Rooms this user may plot on the EO Office calendar. */
export function allottedEoRooms(user: AuthUser | null | undefined): ServiceCode[] {
  if (!user) return [];
  if (isSuperAdmin(user.role)) return [...EO_SERVICE_CODES];
  const rooms = EO_SERVICE_CODES.filter((code) => hasService(user, code));
  if (isEoAdmin(user.role) && rooms.length === 0) return [...EO_SERVICE_CODES];
  return rooms;
}

export function normalizeServices(services: string[] | null | undefined): ServiceCode[] {
  const allowed = new Set<string>(Object.values(SERVICES));
  const out: ServiceCode[] = [];
  for (const s of services ?? []) {
    const n = (s ?? '').trim().toUpperCase();
    if (allowed.has(n) && !out.includes(n as ServiceCode)) {
      out.push(n as ServiceCode);
    }
  }
  return out;
}

export function hasService(
  userOrServices: AuthUser | string[] | null | undefined,
  service: ServiceCode,
): boolean {
  if (!userOrServices) return false;
  if (!Array.isArray(userOrServices) && isSuperAdmin(userOrServices.role)) {
    return ALL_SERVICE_CODES.includes(service);
  }
  const list = Array.isArray(userOrServices)
    ? normalizeServices(userOrServices)
    : normalizeServices(userOrServices.services);
  return list.includes(service);
}

/** Effective services for a user — SUPERADMIN always gets every service. */
export function effectiveServices(user: AuthUser | null | undefined): ServiceCode[] {
  if (!user) return [];
  if (isSuperAdmin(user.role)) return [...ALL_SERVICE_CODES];
  return normalizeServices(user.services);
}

/** True for facilities-shell roles (Facilities Admin or custom roles with /facilities home). */
export function usesFacilitiesShell(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.role) || isFltTech(user.role) || isEoAdmin(user.role)) return false;
  const home = (user.homePath ?? '').trim();
  if (home.startsWith('/eo')) return false;
  if (home.startsWith('/facilities')) return true;
  return isFacilitiesAdmin(user.role) || PUBLIC_SERVICE_CODES.some((s) => hasService(user, s));
}

/** Post-login / guest-guard home path for a role. */
export function homePathForRole(
  role: string | null | undefined,
  homePathFromApi?: string | null,
): string {
  if (homePathFromApi && homePathFromApi.trim()) {
    return homePathFromApi.trim();
  }
  switch (normalizeRole(role)) {
    case ROLES.SUPERADMIN:
      return '/dashboard';
    case ROLES.FACILITIESADMIN:
      return '/facilities/dashboard';
    case ROLES.FLTTECH:
      return '/flt-tech/dashboard';
    case ROLES.NEXUSADMIN:
      return '/facilities/dashboard';
    case ROLES.EOADMIN:
      return '/eo/dashboard';
    default:
      return '/login';
  }
}

export function reservationLinkForService(
  service: ServiceCode,
  shell: 'super' | 'facilities' | 'flt-tech',
): string {
  if (isEoService(service)) return '/eo/dashboard';
  const slug =
    service === 'FLT'
      ? 'flt'
      : service === 'GYMNASIUM'
        ? 'gymnasium'
        : service === 'NEXUS'
          ? 'nexus'
          : 'van';
  if (shell === 'super') return `/reservation/${slug}`;
  if (shell === 'flt-tech') return `/flt-tech/reservation/${slug}`;
  return `/facilities/reservation/${slug}`;
}

export function serviceLabel(service: ServiceCode): string {
  return SERVICE_OPTIONS.find((o) => o.code === service)?.label ?? service;
}

export function serviceIcon(service: ServiceCode): string {
  switch (service) {
    case 'FLT':
      return 'theaters';
    case 'GYMNASIUM':
      return 'sports_basketball';
    case 'VAN':
      return 'airport_shuttle';
    case 'NEXUS':
      return 'co_present';
    case 'BOARDROOM':
      return 'meeting_room';
    case 'CONFERENCE':
      return 'groups';
  }
}
