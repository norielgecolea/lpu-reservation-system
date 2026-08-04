import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, timeout } from 'rxjs';

import { AuthService } from './auth.service';
import {
  hasService,
  homePathForRole,
  isFltTech,
  isSuperAdmin,
  ROLES,
  usesFacilitiesShell,
  type ServiceCode,
} from './roles';

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

/** Guards /facilities/* — Facilities Admin, Super Admin, or custom roles with facilities home. */
export const facilitiesGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) return loginUrl(router);

  const validate = () => {
    const user = auth.user();
    if (isSuperAdmin(user?.role) || usesFacilitiesShell(user)) return true;
    return loginUrl(router);
  };

  if (auth.user()) return validate();

  return sessionCheck(auth).pipe(
    map((res) => (res.success ? validate() : loginUrl(router))),
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

  const validate = () => {
    const user = auth.user();
    if (isSuperAdmin(user?.role)) return true;
    if (user) {
      const home = homePathForRole(user.role, user.homePath);
      if (home !== '/login') return router.parseUrl(home);
    }
    return loginUrl(router);
  };

  if (auth.user()) return validate();

  return sessionCheck(auth).pipe(
    map((res) => (res.success ? validate() : loginUrl(router))),
    catchError(() => {
      auth.logout();
      return of(loginUrl(router));
    }),
  );
};

/**
 * Requires the current user to have the given service code.
 * Use on reservation child routes via `canActivate: [serviceGuard('FLT')]`.
 */
export function serviceGuard(service: ServiceCode): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.token()) return loginUrl(router);

    const validate = () => {
      const user = auth.user();
      if (isSuperAdmin(user?.role) || hasService(user, service)) return true;
      if (user) {
        const home = homePathForRole(user.role, user.homePath);
        if (home !== '/login') return router.parseUrl(home);
      }
      return loginUrl(router);
    };

    if (auth.user()) return validate();

    return sessionCheck(auth).pipe(
      map((res) => (res.success ? validate() : loginUrl(router))),
      catchError(() => {
        auth.logout();
        return of(loginUrl(router));
      }),
    );
  };
}

/** Blocks auth pages (login) for an already-authenticated user. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) {
    return true;
  }

  const toHome = () => {
    const user = auth.user();
    return router.parseUrl(
      homePathForRole(user?.role || ROLES.SUPERADMIN, user?.homePath),
    );
  };

  if (auth.user()) {
    return toHome();
  }

  return sessionCheck(auth).pipe(
    map((res) => (res.success ? toHome() : true)),
    catchError(() => {
      auth.logout();
      return of(true);
    }),
  );
};
