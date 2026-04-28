/**
 * Hits the **real** listening API (default http://127.0.0.1:8787), not an in-process app.
 * Catches drift where `node scripts/smoke-auth-http.mjs` passes but a stale `npm start` still runs old code.
 *
 * Usage (server must be running): from server/
 *   node scripts/smoke-auth-live.mjs
 * Optional: set AUTH_SMOKE_BASE=https://api.example.com
 */
const base = String(process.env.AUTH_SMOKE_BASE ?? 'http://127.0.0.1:8787').replace(
  /\/+$/,
  '',
);

const email = `live_${Date.now()}@example.com`;
const password = '12345678901';

const reg = await fetch(`${base}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const regText = await reg.text();
console.log('register', reg.status, regText.slice(0, 120) + (regText.length > 120 ? '…' : ''));

if (reg.status !== 201) {
  console.error(
    '[smoke-auth-live] Fix: restart the API process after pulling rate-limit/auth changes (`npm start`).',
  );
  process.exit(1);
}

const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginText = await login.text();
console.log('login   ', login.status, loginText.slice(0, 120) + (loginText.length > 120 ? '…' : ''));

const ok = reg.status === 201 && login.status === 200;
process.exit(ok ? 0 : 1);
