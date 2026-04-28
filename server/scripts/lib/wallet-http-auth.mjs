import { randomBytes } from 'node:crypto';

export async function readJsonResponse(res) {
  const raw = await res.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { _raw: raw };
  }
  return { raw, parsed, status: res.status, ok: res.ok };
}

export async function postJson(base, path, bodyObj) {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj),
  });
  return readJsonResponse(r);
}

/**
 * @param {string} base
 * @param {{ email?: string, password?: string }} [opts]
 * @returns {Promise<{ accessToken: string, email: string, password: string }>}
 */
export async function obtainAccessToken(base, opts = {}) {
  const password =
    String(opts.password ?? process.env.WALLET_VERIFY_PASSWORD ?? '').trim() ||
    'WalletLoc01!verify';
  if (password.length < 10) {
    throw new Error('[wallet-auth] password must be >= 10 characters');
  }
  const email =
    String(opts.email ?? process.env.WALLET_VERIFY_EMAIL ?? '').trim() ||
    `wallet_load_${randomBytes(8).toString('hex')}@local.test`;

  const loginFirst = Boolean(String(opts.email ?? process.env.WALLET_VERIFY_EMAIL ?? '').trim());

  const login = () => postJson(base, '/api/auth/login', { email, password });
  const register = () =>
    postJson(base, '/api/auth/register', { email, password });

  if (loginFirst) {
    const log1 = await login();
    if (log1.ok && log1.parsed?.accessToken) {
      return { accessToken: log1.parsed.accessToken, email, password };
    }
  }
  const reg = await register();
  if (reg.status !== 201) {
    const log2 = await login();
    if (!log2.ok || !log2.parsed?.accessToken) {
      throw new Error(
        `[wallet-auth] register=${reg.status} login=${log2.status} ${reg.raw?.slice?.(0, 400)}`,
      );
    }
    return { accessToken: log2.parsed.accessToken, email, password };
  }
  if (!reg.parsed?.accessToken) {
    throw new Error('[wallet-auth] register succeeded but no accessToken');
  }
  const log3 = await login();
  if (!log3.ok || !log3.parsed?.accessToken) {
    throw new Error(`[wallet-auth] login after register failed ${log3.status}`);
  }
  return { accessToken: log3.parsed.accessToken, email, password };
}
