import { Routes } from '@angular/router';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'van',
    loadComponent: () => import('./van/van-reservation').then((m) => m.VanReservation),
  },
  {
    path: 'van/terms',
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
    loadComponent: () =>
      import('./boardroom/boardroom').then((m) => m.BoardroomReservation),
  },
  {
    path: 'conference-room',
    loadComponent: () =>
      import('./conference-room/conference-room').then((m) => m.ConferenceRoomReservation),
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
    loadComponent: () => import('./nexus-room/nexus-room').then((m) => m.NexusRoomReservation),
  },
];
