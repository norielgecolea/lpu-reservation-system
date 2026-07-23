// Dev: API + WebSocket both go through the Angular proxy (same-origin).
// Direct Tomcat WS was cross-origin and flaky with SockJS session cookies.
export const environment = {
  production: false,
  apiUrl: '/lpu-reservation-system/api',
  wsUrl: '/lpu-reservation-system/ws',
  backendUrl: '/',
};
