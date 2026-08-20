import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

export const LEARNER_RESERVATION_HOST = 'learnerreservation.lpulaguna.com';

export function isLearnerReservationHostname(hostname: string): boolean {
  return hostname.toLowerCase() === LEARNER_RESERVATION_HOST;
}

export function currentHostname(): string {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return '';
  }
  return window.location.hostname;
}

export const learnerLandingMatch: CanMatchFn = () =>
  isLearnerReservationHostname(currentHostname());

/** Blocks Van / Nexus / Boardroom / Conference on the learner subdomain. */
export const staffPortalServicesGuard: CanActivateFn = () => {
  if (!isLearnerReservationHostname(currentHostname())) {
    return true;
  }
  return inject(Router).parseUrl('/customer');
};
