const target = process.env['BACKEND_URL'] || 'http://localhost:8080';

module.exports = {
  '/lpu-reservation-system': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
  },
  '/uploads': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
