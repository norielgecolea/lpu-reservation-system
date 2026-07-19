import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, timeout } from 'rxjs';

import { AuthService } from './auth.service';

const AUTH_CHECK_TIMEOUT_MS = 8_000;

function loginUrl(router: Router): UrlTree {
  return router.parseUrl('/login');
}

function sessionCheck(auth: AuthService) {
  return auth.me().pipe(timeout(AUTH_CHECK_TIMEOUT_MS));
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
    if (role === 'FACILITIESADMIN' || role === 'SUPERADMIN') return true;
    return loginUrl(router);
  };

  if (auth.user()) return validate(auth.user()?.role);

  return sessionCheck(auth).pipe(
    map((res) => validate(res.success ? auth.user()?.role : undefined)),
    catchError(() => {
      auth.logout();
      return of(loginUrl(router));
    }),
  );
};

/** Guards super-admin-only routes (e.g. audit logs). */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) return loginUrl(router);

  const validate = (role: string | undefined) => {
    if (role === 'SUPERADMIN') return true;
    return loginUrl(router);
  };

  if (auth.user()) return validate(auth.user()?.role);

  return sessionCheck(auth).pipe(
    map((res) => validate(res.success ? auth.user()?.role : undefined)),
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
  const dashboard = router.parseUrl('/dashboard');

  if (!auth.token()) {
    return true;
  }

  if (auth.user()) {
    return dashboard;
  }

  return sessionCheck(auth).pipe(
    map((res) => (res.success ? dashboard : true)),
    catchError(() => {
      auth.logout();
      return of(true);
    }),
  );
};
