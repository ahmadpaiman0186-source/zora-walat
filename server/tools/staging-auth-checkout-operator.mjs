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
 * Optional: STAGING_OPERATOR_PASSWORD for non-interactive password (not printed).
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
  const fromEnv = String(process.env.STAGING_OPERATOR_PASSWORD ?? '').trim();
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

async function resolveEmail({ required = true } = {}) {
  const saved = await loadEmail();
  const email = await promptLine('Email', { defaultValue: saved });
  if (!isValidEmail(email)) {
    output.write('LOCAL_VALIDATION_ERROR invalid_email\n');
    process.exitCode = 2;
    return null;
  }
  await saveEmail(email);
  return email.toLowerCase();
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
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
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
  return { status: res.status, json, text };
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

async function modeRegister() {
  const email = await resolveEmail();
  if (!email) return;
  const password = await promptPassword('Password');
  if (!isValidPassword(password)) {
    output.write('LOCAL_VALIDATION_ERROR invalid_password_length\n');
    process.exitCode = 2;
    return;
  }

  const body = { email, password };
  const { status, json } = await apiPost('/api/auth/register', body);
  output.write(`REGISTER_HTTP ${status}\n`);

  if (status === 201) {
    output.write('REGISTER_OK\n');
    return;
  }
  if (status === 409 && json?.code === 'auth_email_exists') {
    output.write('USER_ALREADY_EXISTS_USE_LOGIN\n');
    return;
  }
  if (status === 400 || status === 403 || status === 503) {
    printCodeMessage(json);
    return;
  }
  printCodeMessage(json);
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

  const { status, json } = await apiPost('/api/auth/login', { email, password });
  output.write(`LOGIN_HTTP ${status}\n`);

  const token = extractAccessToken(json);
  const saved = status === 200 && (await saveToken(token));
  output.write(`TOKEN_OK ${saved ? 'true' : 'false'}\n`);
}

async function modeRequestOtp() {
  const email = await resolveEmail();
  if (!email) return;

  const { status } = await apiPost('/api/auth/request-otp', { email });
  output.write(`OTP_REQUEST_HTTP ${status}\n`);
}

async function modeVerifyOtp() {
  const email = await resolveEmail();
  if (!email) return;
  const otp = await promptLine('OTP (6 digits)');
  if (!/^\d{6}$/.test(otp)) {
    output.write('LOCAL_VALIDATION_ERROR invalid_otp\n');
    process.exitCode = 2;
    return;
  }

  const { status, json } = await apiPost('/api/auth/verify-otp', { email, otp });
  output.write(`OTP_VERIFY_HTTP ${status}\n`);

  const token = extractAccessToken(json);
  const saved = status === 200 && (await saveToken(token));
  output.write(`TOKEN_OK ${saved ? 'true' : 'false'}\n`);
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

  const { status, json } = await apiPost(
    '/api/create-checkout-session',
    checkoutBody,
    {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': crypto.randomUUID(),
      'User-Agent': 'Mozilla/5.0',
      'X-ZW-Client': 'zw-staging-probe/1',
    },
  );

  output.write(`CHECKOUT_HTTP ${status}\n`);

  const urlOk =
    typeof json?.url === 'string' && json.url.startsWith('https://');
  const orderIdOk =
    typeof json?.orderId === 'string' && json.orderId.length > 0;
  const orderRefOk =
    typeof json?.orderReference === 'string' && json.orderReference.length > 0;

  output.write(`CHECKOUT_URL_OK ${urlOk ? 'true' : 'false'}\n`);
  output.write(`ORDER_ID_OK ${orderIdOk ? 'true' : 'false'}\n`);
  output.write(`ORDER_REFERENCE_OK ${orderRefOk ? 'true' : 'false'}\n`);

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
