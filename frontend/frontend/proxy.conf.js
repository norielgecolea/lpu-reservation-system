const fs = require('fs');
const path = require('path');

/** Load repo-root `.env` into process.env (does not override existing vars). */
function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return;

  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

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
