#!/usr/bin/env node
/**
 * Staging operator harness: auth + checkout without fragile shell one-liners.
 * Never logs password, JWT, checkout URL, or raw env values.
 *
 * Usage (from server/):
 *   node tools/staging-auth-checkout-operator.mjs register
 *   node tools/staging-auth-checkout-operator.mjs login
 *   node tools/staging-auth-checkout-operator.mjs request-otp
 *   node tools/staging-auth-checkout-operator.mjs verify-otp
 *   node tools/staging-auth-checkout-operator.mjs checkout
 *
 * Non-interactive (Windows-safe): set env vars — values are never printed.
 *   STAGING_OPERATOR_EMAIL
 *   STAGING_OPERATOR_PASSWORD
 *   STAGING_OPERATOR_OTP (verify-otp only)
 */
import crypto from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const STAGING_API_BASE = 'https://zora-walat-api-staging.vercel.app';
const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN_PATH = join(SERVER_ROOT, '.staging-token.local');
const EMAIL_PATH = join(SERVER_ROOT, '.staging-operator-email.local');

const MODES = new Set([
  'register',
  'login',
  'request-otp',
  'verify-otp',
  'checkout',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FETCH_TIMEOUT_MS = 30_000;

function usingEnvEmail() {
  return Boolean(envEmail());
}

function usingEnvPassword() {
  return Boolean(envPassword());
}

/** Immediate stdout line (avoids silent hang before buffered flush). */
function safeLine(line) {
  output.write(`${line}\n`);
}

function usage() {
  output.write(
    'Usage: node tools/staging-auth-checkout-operator.mjs <register|login|request-otp|verify-otp|checkout>\n',
  );
}

function isValidEmail(email) {
  const s = String(email ?? '').trim();
  return s.length > 0 && s.length <= 254 && EMAIL_RE.test(s);
}

function isValidPassword(password) {
  const s = String(password ?? '');
  return s.length >= 10 && s.length <= 128;
}

function envEmail() {
  return String(process.env.STAGING_OPERATOR_EMAIL ?? '').trim();
}

function envPassword() {
  return String(process.env.STAGING_OPERATOR_PASSWORD ?? '').trim();
}

function envOtp() {
  return String(process.env.STAGING_OPERATOR_OTP ?? '').trim();
}

async function promptLine(label, { defaultValue = '' } = {}) {
  const rl = createInterface({ input, output });
  try {
    const hint = defaultValue ? ` [${defaultValue}]` : '';
    const raw = await rl.question(`${label}${hint}: `);
    const trimmed = String(raw ?? '').trim();
    return trimmed || defaultValue;
  } finally {
    rl.close();
  }
}

async function promptPassword(label) {
  const fromEnv = envPassword();
  if (fromEnv) return fromEnv;

  if (!input.isTTY) {
    throw new Error(
      'Password required: run in a TTY or set STAGING_OPERATOR_PASSWORD (value is never printed).',
    );
  }

  if (process.platform === 'win32') {
    const rl = createInterface({ input, output });
    try {
      output.write(`${label} (input may echo on Windows): `);
      const pw = await rl.question('');
      output.write('\n');
      return pw;
    } finally {
      rl.close();
    }
  }

  output.write(`${label}: `);
  return new Promise((resolve, reject) => {
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');
    let value = '';
    const onData = (ch) => {
      if (ch === '\u0003') {
        input.setRawMode(false);
        input.pause();
        input.removeListener('data', onData);
        reject(new Error('Cancelled'));
        return;
      }
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        input.setRawMode(false);
        input.pause();
        input.removeListener('data', onData);
        output.write('\n');
        resolve(value);
        return;
      }
      if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1);
        return;
      }
      value += ch;
    };
    input.on('data', onData);
  });
}

async function saveEmail(email) {
  await writeFile(EMAIL_PATH, `${email}\n`, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    await chmod(EMAIL_PATH, 0o600).catch(() => {});
  }
}

async function loadEmail() {
  try {
    return String(await readFile(EMAIL_PATH, 'utf8')).trim();
  } catch {
    return '';
  }
}

async function resolveEmail() {
  const fromEnv = envEmail();
  let email = fromEnv;
  if (!email) {
    const saved = await loadEmail();
    email = await promptLine('Email', { defaultValue: saved });
  }
  if (!isValidEmail(email)) {
    output.write('LOCAL_VALIDATION_ERROR invalid_email\n');
    process.exitCode = 2;
    return null;
  }
  const normalized = email.toLowerCase();
  await saveEmail(normalized);
  return normalized;
}

async function resolveOtp() {
  const fromEnv = envOtp();
  if (fromEnv) return fromEnv;
  return promptLine('OTP (6 digits)');
}

async function saveToken(token) {
  const t = String(token ?? '').trim();
  if (!t) return false;
  await writeFile(TOKEN_PATH, `${t}\n`, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    await chmod(TOKEN_PATH, 0o600).catch(() => {});
  }
  return true;
}

async function loadToken() {
  try {
    return String(await readFile(TOKEN_PATH, 'utf8')).trim();
  } catch {
    return '';
  }
}

async function apiPost(path, body, headers = {}) {
  const url = `${STAGING_API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json = null;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { status: res.status, json, text, timedOut: false };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { status: null, json: null, text: '', timedOut: true };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function printCodeMessage(json) {
  const code = json?.code != null ? String(json.code) : 'unknown';
  const message =
    json?.message != null
      ? String(json.message)
      : json?.error != null
        ? String(json.error)
        : 'unknown';
  output.write(`code ${code}\n`);
  output.write(`message ${message}\n`);
}

function extractAccessToken(json) {
  const t = json?.accessToken;
  return typeof t === 'string' && t.length > 20 ? t : '';
}

/**
 * Register credentials: env-only when both STAGING_OPERATOR_* are set;
 * otherwise interactive fallback (TTY required).
 */
async function resolveRegisterCredentials() {
  const hasEmailEnv = usingEnvEmail();
  const hasPasswordEnv = usingEnvPassword();

  if (hasEmailEnv && hasPasswordEnv) {
    const email = envEmail().toLowerCase();
    const password = envPassword();
    if (!isValidEmail(email)) {
      safeLine('LOCAL_VALIDATION_ERROR invalid_email');
      process.exitCode = 2;
      return null;
    }
    if (!isValidPassword(password)) {
      safeLine('LOCAL_VALIDATION_ERROR invalid_password_length');
      process.exitCode = 2;
      return null;
    }
    await saveEmail(email);
    return { email, password };
  }

  if (!input.isTTY) {
    safeLine(
      'LOCAL_VALIDATION_ERROR set STAGING_OPERATOR_EMAIL and STAGING_OPERATOR_PASSWORD',
    );
    process.exitCode = 2;
    return null;
  }

  const email = await resolveEmail();
  if (!email) return null;
  const password = await promptPassword('Password');
  if (!isValidPassword(password)) {
    safeLine('LOCAL_VALIDATION_ERROR invalid_password_length');
    process.exitCode = 2;
    return null;
  }
  return { email, password };
}

async function modeRegister() {
  safeLine('MODE register');
  safeLine(`USING_ENV_EMAIL ${usingEnvEmail() ? 'true' : 'false'}`);
  safeLine(`USING_ENV_PASSWORD ${usingEnvPassword() ? 'true' : 'false'}`);

  const creds = await resolveRegisterCredentials();
  if (!creds) {
    safeLine('REQUEST_DONE register');
    return;
  }

  safeLine('REQUEST_START register');
  const result = await apiPost('/api/auth/register', {
    email: creds.email,
    password: creds.password,
  });
  safeLine('REQUEST_DONE register');

  if (result.timedOut) {
    safeLine('REGISTER_HTTP timeout');
    safeLine('REGISTER_OK false');
    safeLine('USER_ALREADY_EXISTS_USE_LOGIN false');
    process.exitCode = 1;
    return;
  }

  const { status, json } = result;
  const registerOk = status === 201;
  const userExists =
    status === 409 && json?.code === 'auth_email_exists';

  safeLine(`REGISTER_HTTP ${status}`);
  safeLine(`REGISTER_OK ${registerOk ? 'true' : 'false'}`);
  safeLine(
    `USER_ALREADY_EXISTS_USE_LOGIN ${userExists ? 'true' : 'false'}`,
  );

  if (status === 400 || status === 403 || status === 503) {
    printCodeMessage(json);
  } else if (!registerOk && !userExists) {
    printCodeMessage(json);
  }
}

async function modeLogin() {
  const email = await resolveEmail();
  if (!email) return;
  const password = await promptPassword('Password');
  if (!password) {
    output.write('LOCAL_VALIDATION_ERROR password_required\n');
    process.exitCode = 2;
    return;
  }

  const { status, json, timedOut } = await apiPost('/api/auth/login', {
    email,
    password,
  });
  if (timedOut) {
    safeLine('LOGIN_HTTP timeout');
    safeLine('TOKEN_OK false');
    process.exitCode = 1;
    return;
  }
  safeLine(`LOGIN_HTTP ${status}`);

  const token = extractAccessToken(json);
  const saved = status === 200 && (await saveToken(token));
  safeLine(`TOKEN_OK ${saved ? 'true' : 'false'}`);
}

async function modeRequestOtp() {
  const email = await resolveEmail();
  if (!email) return;

  const { status, timedOut } = await apiPost('/api/auth/request-otp', { email });
  if (timedOut) {
    safeLine('OTP_REQUEST_HTTP timeout');
    process.exitCode = 1;
    return;
  }
  safeLine(`OTP_REQUEST_HTTP ${status}`);
}

async function modeVerifyOtp() {
  const email = await resolveEmail();
  if (!email) return;
  const otp = await resolveOtp();
  if (!/^\d{6}$/.test(otp)) {
    output.write('LOCAL_VALIDATION_ERROR invalid_otp\n');
    process.exitCode = 2;
    return;
  }

  const { status, json, timedOut } = await apiPost('/api/auth/verify-otp', {
    email,
    otp,
  });
  if (timedOut) {
    safeLine('OTP_VERIFY_HTTP timeout');
    safeLine('TOKEN_OK false');
    process.exitCode = 1;
    return;
  }
  safeLine(`OTP_VERIFY_HTTP ${status}`);

  const token = extractAccessToken(json);
  const saved = status === 200 && (await saveToken(token));
  safeLine(`TOKEN_OK ${saved ? 'true' : 'false'}`);
}

async function modeCheckout() {
  const token = await loadToken();
  if (!token) {
    output.write('CHECKOUT_HTTP 0\n');
    output.write('CHECKOUT_URL_OK false\n');
    output.write('ORDER_ID_OK false\n');
    output.write('ORDER_REFERENCE_OK false\n');
    output.write('LOCAL_ERROR missing_token_run_login_or_verify_otp\n');
    process.exitCode = 2;
    return;
  }

  const checkoutBody = {
    currency: 'usd',
    senderCountry: 'US',
    amountUsdCents: 500,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  };

  const { status, json, timedOut } = await apiPost(
    '/api/create-checkout-session',
    checkoutBody,
    {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': crypto.randomUUID(),
      'User-Agent': 'Mozilla/5.0',
      'X-ZW-Client': 'zw-staging-probe/1',
    },
  );

  if (timedOut) {
    safeLine('CHECKOUT_HTTP timeout');
    safeLine('CHECKOUT_URL_OK false');
    safeLine('ORDER_ID_OK false');
    safeLine('ORDER_REFERENCE_OK false');
    process.exitCode = 1;
    return;
  }

  safeLine(`CHECKOUT_HTTP ${status}`);

  const urlOk =
    typeof json?.url === 'string' && json.url.startsWith('https://');
  const orderIdOk =
    typeof json?.orderId === 'string' && json.orderId.length > 0;
  const orderRefOk =
    typeof json?.orderReference === 'string' && json.orderReference.length > 0;

  safeLine(`CHECKOUT_URL_OK ${urlOk ? 'true' : 'false'}`);
  safeLine(`ORDER_ID_OK ${orderIdOk ? 'true' : 'false'}`);
  safeLine(`ORDER_REFERENCE_OK ${orderRefOk ? 'true' : 'false'}`);

  if (status !== 200) {
    printCodeMessage(json);
  }
}

async function main() {
  const mode = String(process.argv[2] ?? '').trim().toLowerCase();
  if (!MODES.has(mode)) {
    usage();
    process.exitCode = 1;
    return;
  }

  switch (mode) {
    case 'register':
      await modeRegister();
      break;
    case 'login':
      await modeLogin();
      break;
    case 'request-otp':
      await modeRequestOtp();
      break;
    case 'verify-otp':
      await modeVerifyOtp();
      break;
    case 'checkout':
      await modeCheckout();
      break;
    default:
      usage();
      process.exitCode = 1;
  }
}

main().catch((err) => {
  output.write(`FATAL ${err?.message ?? 'unknown'}\n`);
  process.exitCode = 1;
});
