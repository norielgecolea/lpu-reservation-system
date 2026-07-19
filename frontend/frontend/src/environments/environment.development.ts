// Dev: API goes through proxy; WebSocket connects directly to Tomcat (proxy WS is unreliable).
export const environment = {
  production: false,
  apiUrl: '/lpu-reservation-system/api',
  wsUrl: 'http://localhost:8080/lpu-reservation-system/ws',
  backendUrl: '/',
};
