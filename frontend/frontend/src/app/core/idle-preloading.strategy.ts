import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { PreloadingStrategy, Route, Routes } from '@angular/router';
import { EMPTY, Observable, switchMap } from 'rxjs';

import { AuthService } from './auth/auth.service';

const PRELOAD_IDLE_TIMEOUT_MS = 2_500;

/** Mark lazy admin/staff routes so they prefetch after the first page is up. */
export function withRoutePreload(routes: Routes): Routes {
  return routes.map((route) => ({
    ...route,
    data: { ...route.data, preload: true },
  }));
}

function whenIdle(): Observable<void> {
  return new Observable((observer) => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(
        () => {
          observer.next();
          observer.complete();
        },
        { timeout: PRELOAD_IDLE_TIMEOUT_MS },
      );
      return () => cancelIdleCallback(id);
    }

    const id = setTimeout(() => {
      observer.next();
      observer.complete();
    }, PRELOAD_IDLE_TIMEOUT_MS);
    return () => clearTimeout(id);
  });
}

/**
 * Prefetches flagged lazy routes once the browser is idle, and only for a
 * signed-in staff session so the public customer app does not download admin JS.
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloadingStrategy implements PreloadingStrategy {
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!this.isBrowser || route.data?.['preload'] !== true || !this.auth.user()) {
      return EMPTY;
    }
    return whenIdle().pipe(switchMap(() => load()));
  }
}
