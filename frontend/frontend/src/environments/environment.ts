// Production defaults. Replaced by environment.development.ts in dev builds.
export const environment = {
  production: true,
  // Backend context + API prefix. Prepend a host if served separately in prod.
  apiUrl: '/lpu-reservation-system/api',
  // STOMP/SockJS endpoint (apiUrl without /api suffix + /ws)
  wsUrl: '/lpu-reservation-system/ws',
  // Backend root for assets outside the API context (e.g. /uploads). Relative so
  // the proxy / same-origin host resolves it; prepend a host if served separately.
  backendUrl: '/',
};
