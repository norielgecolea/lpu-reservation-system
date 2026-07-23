import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, timeout } from 'rxjs';

import { AuthService } from './auth.service';
import { homePathForRole, isFacilitiesAdmin, isFltTech, isSuperAdmin, ROLES } from './roles';

const AUTH_CHECK_TIMEOUT_MS = 8_000;

function loginUrl(router: Router): UrlTree {
  return router.parseUrl('/login');
}

function sessionCheck(auth: AuthService) {
  return auth.me().pipe(timeout(AUTH_CHECK_TIMEOUT_MS));
}

function roleFrom(auth: AuthService): string | undefined {
  return auth.user()?.role;
}

/** Guards a route by validating the stored token against `/auth/me`. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token();

  if (!token) {
    return loginUrl(router);
  }

  return sessionCheck(auth).pipe(
    map((res) => {
      if (res.success) {
        return true;
      }
      auth.logout();
      return loginUrl(router);
    }),
    catchError(() => {
      auth.logout();
      return of(loginUrl(router));
    }),
  );
};

/** Guards /facilities/* routes — requires FACILITIESADMIN (or SUPERADMIN) role. */
export const facilitiesGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) return loginUrl(router);

  const validate = (role: string | undefined) => {
    if (isFacilitiesAdmin(role) || isSuperAdmin(role)) return true;
    return loginUrl(router);
  };

  if (auth.user()) return validate(roleFrom(auth));

  return sessionCheck(auth).pipe(
    map((res) => validate(res.success ? roleFrom(auth) : undefined)),
    catchError(() => {
      auth.logout();
      return of(loginUrl(router));
    }),
  );
};

/** Guards /flt-tech/* — FLT Tech (or SUPERADMIN for support). */
export const fltTechGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) return loginUrl(router);

  const validate = (role: string | undefined) => {
    if (isFltTech(role) || isSuperAdmin(role)) return true;
    return loginUrl(router);
  };

  if (auth.user()) return validate(roleFrom(auth));

  return sessionCheck(auth).pipe(
    map((res) => validate(res.success ? roleFrom(auth) : undefined)),
    catchError(() => {
      auth.logout();
      return of(loginUrl(router));
    }),
  );
};

/** Guards super-admin-only routes (e.g. audit logs, top-level admin shell). */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) return loginUrl(router);

  const validate = (role: string | undefined) => {
    if (isSuperAdmin(role)) return true;
    // Send known roles to their home instead of a dead login loop.
    if (role) {
      const home = homePathForRole(role);
      if (home !== '/login') return router.parseUrl(home);
    }
    return loginUrl(router);
  };

  if (auth.user()) return validate(roleFrom(auth));

  return sessionCheck(auth).pipe(
    map((res) => validate(res.success ? roleFrom(auth) : undefined)),
    catchError(() => {
      auth.logout();
      return of(loginUrl(router));
    }),
  );
};

/** Blocks auth pages (login) for an already-authenticated user. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) {
    return true;
  }

  const toHome = (role: string | undefined) =>
    router.parseUrl(homePathForRole(role || ROLES.SUPERADMIN));

  if (auth.user()) {
    return toHome(roleFrom(auth));
  }

  return sessionCheck(auth).pipe(
    map((res) => (res.success ? toHome(roleFrom(auth)) : true)),
    catchError(() => {
      auth.logout();
      return of(true);
    }),
  );
};
