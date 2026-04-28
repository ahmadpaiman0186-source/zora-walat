/**
 * In-process Express: POST /api/auth/register then POST /api/auth/login (same credentials).
 * Does **not** exercise a long-running `npm start` — use `smoke-auth-live.mjs` for that.
 *
 * Usage: from server/: node scripts/smoke-auth-http.mjs
 */
import '../bootstrap.js';
import { createApp } from '../src/app.js';

const app = createApp();
const server = await new Promise((resolve, reject) => {
  const s = app.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve(s)));
});

const { port } = server.address();
const email = `smoke_${Date.now()}@example.com`;
const password = '12345678901';

const reg = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const regText = await reg.text();
console.log('register', reg.status, regText.slice(0, 120) + (regText.length > 120 ? '…' : ''));

if (reg.status !== 201) {
  await new Promise((r) => server.close(r));
  process.exit(1);
}

const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginText = await login.text();
console.log('login   ', login.status, loginText.slice(0, 120) + (loginText.length > 120 ? '…' : ''));

await new Promise((resolve, reject) => {
  server.close((err) => (err ? reject(err) : resolve()));
});

const ok = reg.status === 201 && login.status === 200;
process.exit(ok ? 0 : 1);
