import { Routes } from '@angular/router';

import { learnerLandingMatch, staffPortalServicesGuard } from '../../core/portal';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    canMatch: [learnerLandingMatch],
    loadComponent: () =>
      import('./landing-page/learner-landing-page').then((m) => m.LearnerLandingPage),
  },
  {
    path: '',
    loadComponent: () => import('./landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'van',
    canActivate: [staffPortalServicesGuard],
    loadComponent: () => import('./van/van-reservation').then((m) => m.VanReservation),
  },
  {
    path: 'van/terms',
    canActivate: [staffPortalServicesGuard],
    loadComponent: () => import('./van/van-terms').then((m) => m.VanTerms),
  },
  {
    path: 'flt',
    loadComponent: () => import('./flt/flt-reservation').then((m) => m.FltReservation),
  },
  {
    path: 'flt/terms',
    loadComponent: () => import('./flt/flt-terms').then((m) => m.FltTerms),
  },
  {
    path: 'boardroom',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'conference-room',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'gymnasium',
    loadComponent: () => import('./gymnasium/gymnasium-reservation').then((m) => m.GymnasiumReservation),
  },
  {
    path: 'gymnasium/terms',
    loadComponent: () => import('./gymnasium/gymnasium-terms').then((m) => m.GymnasiumTerms),
  },
  {
    path: 'nexus-room',
    canActivate: [staffPortalServicesGuard],
    loadComponent: () => import('./nexus-room/nexus-reservation').then((m) => m.NexusReservation),
  },
  {
    path: 'nexus-room/terms',
    canActivate: [staffPortalServicesGuard],
    loadComponent: () => import('./nexus-room/nexus-terms').then((m) => m.NexusTerms),
  },
];
