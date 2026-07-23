/** Canonical role strings returned by the backend JWT /auth/me. */
export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  FACILITIESADMIN: 'FACILITIESADMIN',
  FLTTECH: 'FLTTECH',
  NEXUSADMIN: 'NEXUSADMIN',
  EOADMIN: 'EOADMIN',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

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

/** Post-login / guest-guard home path for a role. */
export function homePathForRole(role: string | null | undefined): string {
  switch (normalizeRole(role)) {
    case ROLES.SUPERADMIN:
      return '/dashboard';
    case ROLES.FACILITIESADMIN:
      return '/facilities/dashboard';
    case ROLES.FLTTECH:
      return '/flt-tech/dashboard';
    case ROLES.NEXUSADMIN:
      return '/nexus/dashboard';
    case ROLES.EOADMIN:
      return '/eo/dashboard';
    default:
      return '/login';
  }
}
