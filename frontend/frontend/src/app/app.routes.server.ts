import { RenderMode, ServerRoute } from '@angular/ssr';

/** Routes that call the backend on init must not be prerendered. */
export const serverRoutes: ServerRoute[] = [
  { path: 'customer/**', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'users/**', renderMode: RenderMode.Client },
  { path: 'equipments/**', renderMode: RenderMode.Client },
  { path: 'vehicles/**', renderMode: RenderMode.Client },
  { path: 'reservation/**', renderMode: RenderMode.Client },
  { path: 'facilities/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
