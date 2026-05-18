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
 *   node tools/staging-auth-checkout-operator.mjs checkout-open-test
 *   node tools/staging-auth-checkout-operator.mjs status-check
 *   node tools/staging-auth-checkout-operator.mjs auth-env-check
 *   node tools/staging-auth-checkout-operator.mjs auth-check
 *   node tools/staging-auth-checkout-operator.mjs phase1-truth-check
 *
 * Phase 2 (test payment): requires STAGING_ALLOW_STRIPE_TEST_PAYMENT=true.
 * checkout-open-test saves URL to .staging-checkout-url.local (gitignored); never printed.
 *
 * Non-interactive (Windows-safe): set env vars — values are never printed.
 *   STAGING_OPERATOR_EMAIL
 *   STAGING_OPERATOR_PASSWORD
 *   STAGING_OPERATOR_OTP (verify-otp only)
 */
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  LOGIN_API_PATH,
  accessTokenExpiryIso,
  classifyStoredToken,
  credentialEnvDiagnostics,
  isAccessTokenExpired,
  loadOperatorDotenv,
  readOperatorEmail,
  readOperatorPassword,
  windowsEnvSetupHintLines,
} from './stagingOperatorAuthEnv.mjs';

const STAGING_API_BASE = 'https://zora-walat-api-staging.vercel.app';
const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN_PATH = join(SERVER_ROOT, '.staging-token.local');
const EMAIL_PATH = join(SERVER_ROOT, '.staging-operator-email.local');
const CHECKOUT_URL_PATH = join(SERVER_ROOT, '.staging-checkout-url.local');
const ORDER_ID_PATH = join(SERVER_ROOT, '.staging-order-id.local');
const ORDER_REFERENCE_PATH = join(SERVER_ROOT, '.staging-order-reference.local');

const STATUS_CHECK_SLIM_TIMEOUT_MS = 45_000;
const STATUS_CHECK_LEGACY_TIMEOUT_MS = 120_000;
const PHASE1_TRUTH_SLIM_TIMEOUT_MS = 45_000;
const STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX =
  '/api/ops/staging-operator-order-status/';
const STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX =
  '/api/ops/staging-operator-phase1-truth/';

const MODES = new Set([
  'register',
  'login',
  'request-otp',
  'verify-otp',
  'checkout',
  'checkout-open-test',
  'status-check',
  'auth-env-check',
  'auth-check',
  'phase1-truth-check',
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
    'Usage: node tools/staging-auth-checkout-operator.mjs <register|login|request-otp|verify-otp|checkout|checkout-open-test|status-check|auth-env-check|auth-check|phase1-truth-check>\n',
  );
}

function printWindowsEnvHints() {
  for (const line of windowsEnvSetupHintLines()) {
    safeLine(line);
  }
}

function printCredentialEnvDiagnostics() {
  const d = credentialEnvDiagnostics(process.env);
  safeLine(`HAS_EMAIL ${d.hasEmail ? 'true' : 'false'}`);
  safeLine(`HAS_PASSWORD ${d.hasPassword ? 'true' : 'false'}`);
  safeLine(`EMAIL_LENGTH ${d.emailLength}`);
  safeLine(`PASSWORD_LENGTH ${d.passwordLength}`);
}

function printLoginRequestDiagnostics(email) {
  safeLine(`LOGIN_API_ORIGIN ${apiOriginOnly()}`);
  safeLine(`LOGIN_ENDPOINT ${LOGIN_API_PATH}`);
  safeLine(`USING_ENV_EMAIL ${usingEnvEmail() ? 'true' : 'false'}`);
  safeLine(`USING_ENV_PASSWORD ${usingEnvPassword() ? 'true' : 'false'}`);
  printCredentialEnvDiagnostics();
  safeLine(`LOGIN_EMAIL_PRESENT ${email ? 'true' : 'false'}`);
  safeLine(`TOKEN_FILE_PATH ${TOKEN_PATH}`);
  safeLine(`TOKEN_FILE_EXISTS ${existsSync(TOKEN_PATH) ? 'true' : 'false'}`);
}

function printTokenFileDiagnostics(token) {
  const state = classifyStoredToken(token);
  safeLine(`TOKEN_FILE_PATH ${TOKEN_PATH}`);
  safeLine(`TOKEN_FILE_EXISTS ${token ? 'true' : 'false'}`);
  safeLine(`TOKEN_STATE ${state}`);
  const expIso = token ? accessTokenExpiryIso(token) : null;
  if (expIso) {
    safeLine(`TOKEN_EXPIRY_ISO ${expIso}`);
    safeLine(
      `TOKEN_EXPIRED ${isAccessTokenExpired(token) === true ? 'true' : 'false'}`,
    );
  } else if (token) {
    safeLine('TOKEN_EXPIRY_ISO unknown');
  }
}

function failPasswordRequiredNonInteractive() {
  safeLine('LOCAL_VALIDATION_ERROR password_required');
  safeLine(
    'HINT set STAGING_OPERATOR_PASSWORD in the same PowerShell session before login',
  );
  printWindowsEnvHints();
  process.exitCode = 2;
}

function failEmailRequiredNonInteractive() {
  safeLine('LOCAL_VALIDATION_ERROR email_required');
  safeLine(
    'HINT set STAGING_OPERATOR_EMAIL in the same PowerShell session before login',
  );
  printWindowsEnvHints();
  process.exitCode = 2;
}

function envTruthy(name) {
  const v = String(process.env[name] ?? '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Stripe test Checkout sessions use cs_test_ in the path; never log the full URL.
 * @param {string | undefined} url
 */
export function isStripeTestCheckoutSessionUrl(url) {
  const s = String(url ?? '');
  if (!s.startsWith('https://')) return false;
  return /\/cs_test_[a-zA-Z0-9]+/.test(s) || s.includes('cs_test_');
}

/**
 * @param {string | undefined} url
 */
export function isStripeLiveCheckoutSessionUrl(url) {
  const s = String(url ?? '');
  if (!s.startsWith('https://')) return false;
  return /\/cs_live_[a-zA-Z0-9]+/.test(s) || s.includes('cs_live_');
}

async function saveCheckoutUrl(url) {
  const u = String(url ?? '').trim();
  if (!u.startsWith('https://')) return false;
  await writeFile(CHECKOUT_URL_PATH, `${u}\n`, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    await chmod(CHECKOUT_URL_PATH, 0o600).catch(() => {});
  }
  return true;
}

async function saveOrderId(orderId) {
  const id = String(orderId ?? '').trim();
  if (id.length < 8) return false;
  await writeFile(ORDER_ID_PATH, `${id}\n`, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    await chmod(ORDER_ID_PATH, 0o600).catch(() => {});
  }
  return true;
}

async function saveOrderReference(orderReference) {
  const ref = String(orderReference ?? '').trim();
  if (ref.length < 8) return false;
  await writeFile(ORDER_REFERENCE_PATH, `${ref}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  if (process.platform !== 'win32') {
    await chmod(ORDER_REFERENCE_PATH, 0o600).catch(() => {});
  }
  return true;
}

async function loadOrderId() {
  try {
    return String(await readFile(ORDER_ID_PATH, 'utf8')).trim();
  } catch {
    return '';
  }
}

function redactIdPreview(id) {
  const s = String(id ?? '').trim();
  if (s.length < 10) return '(empty-or-short)';
  return `…${s.slice(-10)}`;
}

function apiOriginOnly() {
  try {
    return new URL(STAGING_API_BASE).origin;
  } catch {
    return STAGING_API_BASE;
  }
}

/**
 * Safe response preview: status code + JSON keys or short error code only.
 * @param {{ status: number | null, json: unknown, text: string, timedOut: boolean }} result
 */
function safeResponsePreview(result) {
  if (result.timedOut) return 'timeout_no_body';
  if (result.status == null) return 'no_http_status';
  if (result.json && typeof result.json === 'object') {
    const keys = Object.keys(result.json).slice(0, 12).join(',');
    return `http_${result.status}_keys_${keys || 'empty_object'}`;
  }
  const t = String(result.text ?? '').slice(0, 80);
  if (!t) return `http_${result.status}_empty_body`;
  if (/^[\x20-\x7e]+$/.test(t)) return `http_${result.status}_text_len_${t.length}`;
  return `http_${result.status}_non_json_body`;
}

function logSavedStateDebug() {
  safeLine(`STATUS_CHECK_CWD ${process.cwd()}`);
  safeLine(`STATUS_CHECK_SERVER_ROOT ${SERVER_ROOT}`);
  safeLine(`STATUS_CHECK_ORDER_ID_FILE ${ORDER_ID_PATH}`);
  safeLine(`STATUS_CHECK_ORDER_ID_FILE_EXISTS ${existsSync(ORDER_ID_PATH)}`);
  safeLine(`STATUS_CHECK_ORDER_REF_FILE ${ORDER_REFERENCE_PATH}`);
  safeLine(
    `STATUS_CHECK_ORDER_REF_FILE_EXISTS ${existsSync(ORDER_REFERENCE_PATH)}`,
  );
  safeLine(`STATUS_CHECK_CHECKOUT_URL_FILE ${CHECKOUT_URL_PATH}`);
  safeLine(
    `STATUS_CHECK_CHECKOUT_URL_FILE_EXISTS ${existsSync(CHECKOUT_URL_PATH)}`,
  );
}

function openCheckoutUrlInBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
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
  return readOperatorEmail(process.env);
}

function envPassword() {
  return readOperatorPassword(process.env);
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

async function apiFetch(method, path, { body, headers = {}, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const url = `${STAGING_API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
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

async function apiPost(path, body, headers = {}) {
  return apiFetch('POST', path, { body, headers });
}

async function apiGet(path, headers = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  return apiFetch('GET', path, { headers, timeoutMs });
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
/**
 * Env-first login credentials; interactive only when TTY and env incomplete.
 * @returns {Promise<{ email: string, password: string } | null>}
 */
async function resolveLoginCredentials() {
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
    if (!password) {
      failPasswordRequiredNonInteractive();
      return null;
    }
    await saveEmail(email);
    return { email, password };
  }

  if (!input.isTTY) {
    if (!hasEmailEnv) failEmailRequiredNonInteractive();
    else failPasswordRequiredNonInteractive();
    return null;
  }

  const email = await resolveEmail();
  if (!email) return null;
  const password = await promptPassword('Password');
  if (!password) {
    safeLine('LOCAL_VALIDATION_ERROR password_required');
    process.exitCode = 2;
    return null;
  }
  return { email, password };
}

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
  safeLine('MODE login');
  const creds = await resolveLoginCredentials();
  if (!creds) {
    safeLine('LOGIN_SKIPPED true');
    return;
  }

  printLoginRequestDiagnostics(creds.email);

  const { status, json, timedOut } = await apiPost(LOGIN_API_PATH, {
    email: creds.email,
    password: creds.password,
  });
  if (timedOut) {
    safeLine('LOGIN_HTTP timeout');
    safeLine('TOKEN_OK false');
    safeLine('TOKEN_SAVED false');
    process.exitCode = 1;
    return;
  }
  safeLine(`LOGIN_HTTP ${status}`);
  safeLine(`LOGIN_RESPONSE_PREVIEW ${safeResponsePreview({ status, json, text: '', timedOut: false })}`);

  if (status === 401) {
    safeLine('LOGIN_HINT invalid_email_or_password_or_inactive_user_on_staging');
    printCodeMessage(json);
  } else if (status === 403) {
    safeLine(
      'LOGIN_HINT access_denied_check_Vercel_OWNER_ALLOWED_EMAIL_matches_operator_email',
    );
    printCodeMessage(json);
  } else if (status !== 200) {
    printCodeMessage(json);
  }

  const token = extractAccessToken(json);
  const saved = status === 200 && (await saveToken(token));
  safeLine(`TOKEN_OK ${saved ? 'true' : 'false'}`);
  safeLine(`TOKEN_SAVED ${saved ? 'true' : 'false'}`);
  if (saved) {
    printTokenFileDiagnostics(token);
  }
  if (!saved) {
    process.exitCode = status === 200 ? 2 : 1;
  }
}

async function modeAuthEnvCheck() {
  safeLine('MODE auth-env-check');
  safeLine(`LOGIN_API_ORIGIN ${apiOriginOnly()}`);
  safeLine(`LOGIN_ENDPOINT ${LOGIN_API_PATH}`);
  printCredentialEnvDiagnostics();
  safeLine(`INTERACTIVE_TTY ${input.isTTY ? 'true' : 'false'}`);
  safeLine(`TOKEN_FILE_PATH ${TOKEN_PATH}`);
  const token = await loadToken();
  printTokenFileDiagnostics(token);
  if (!usingEnvEmail() || !usingEnvPassword()) {
    printWindowsEnvHints();
    process.exitCode = 2;
  }
}

async function modeAuthCheck() {
  safeLine('MODE auth-check');
  const d = credentialEnvDiagnostics(process.env);
  if (!d.hasEmail || !d.hasPassword) {
    safeLine('AUTH_CHECK_PASS false');
    if (!d.hasEmail) failEmailRequiredNonInteractive();
    else failPasswordRequiredNonInteractive();
    return;
  }

  await modeLogin();
  if (process.exitCode && process.exitCode !== 0) {
    safeLine('AUTH_CHECK_PASS false');
    safeLine('AUTH_CHECK_STAGE login_failed');
    return;
  }

  const token = await loadToken();
  if (!token || classifyStoredToken(token) === 'expired') {
    safeLine('AUTH_CHECK_PASS false');
    safeLine('AUTH_CHECK_STAGE token_missing_or_expired_after_login');
    printTokenFileDiagnostics(token);
    process.exitCode = 2;
    return;
  }

  const priorExit = process.exitCode;
  process.exitCode = 0;
  await modeStatusCheck();
  const statusOk = process.exitCode === 0 || process.exitCode === undefined;
  process.exitCode = statusOk ? 0 : process.exitCode ?? 1;

  if (statusOk) {
    safeLine('AUTH_CHECK_PASS true');
  } else {
    safeLine('AUTH_CHECK_PASS false');
    safeLine('AUTH_CHECK_STAGE status_check_failed');
    if (priorExit) process.exitCode = priorExit;
  }
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

async function runHostedCheckoutProbe({ persistForPhase2 = false } = {}) {
  const token = await loadToken();
  if (!token) {
    safeLine('CHECKOUT_HTTP 0');
    safeLine('CHECKOUT_URL_OK false');
    safeLine('ORDER_ID_OK false');
    safeLine('ORDER_REFERENCE_OK false');
    if (persistForPhase2) {
      safeLine('LOCAL_CHECKOUT_URL_SAVED false');
      safeLine('STRIPE_TEST_MODE_CONFIRMED false');
    }
    safeLine('LOCAL_ERROR TOKEN_MISSING_OR_EXPIRED');
    process.exitCode = 2;
    return null;
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
    if (persistForPhase2) {
      safeLine('LOCAL_CHECKOUT_URL_SAVED false');
      safeLine('STRIPE_TEST_MODE_CONFIRMED false');
    }
    process.exitCode = 1;
    return null;
  }

  safeLine(`CHECKOUT_HTTP ${status}`);

  const checkoutUrl = typeof json?.url === 'string' ? json.url : '';
  const urlOk = checkoutUrl.startsWith('https://');
  const orderIdOk =
    typeof json?.orderId === 'string' && json.orderId.length > 0;
  const orderRefOk =
    typeof json?.orderReference === 'string' && json.orderReference.length > 0;
  const testSession = isStripeTestCheckoutSessionUrl(checkoutUrl);
  const liveSession = isStripeLiveCheckoutSessionUrl(checkoutUrl);

  safeLine(`CHECKOUT_URL_OK ${urlOk ? 'true' : 'false'}`);
  safeLine(`ORDER_ID_OK ${orderIdOk ? 'true' : 'false'}`);
  safeLine(`ORDER_REFERENCE_OK ${orderRefOk ? 'true' : 'false'}`);

  if (persistForPhase2) {
    if (liveSession) {
      safeLine('STRIPE_TEST_MODE_CONFIRMED false');
      safeLine('STRIPE_LIVE_SESSION_DETECTED true');
      safeLine('LOCAL_CHECKOUT_URL_SAVED false');
      process.exitCode = 2;
      return null;
    }
    safeLine(`STRIPE_TEST_MODE_CONFIRMED ${testSession ? 'true' : 'false'}`);
    if (!testSession && urlOk) {
      process.exitCode = 2;
      return null;
    }
    const urlSaved = urlOk && testSession && (await saveCheckoutUrl(checkoutUrl));
    const orderSaved =
      orderIdOk && (await saveOrderId(json.orderId));
    const refSaved =
      orderRefOk && (await saveOrderReference(json.orderReference));
    safeLine(`LOCAL_CHECKOUT_URL_SAVED ${urlSaved ? 'true' : 'false'}`);
    safeLine(`LOCAL_ORDER_ID_SAVED ${orderSaved ? 'true' : 'false'}`);
    safeLine(`LOCAL_ORDER_REFERENCE_SAVED ${refSaved ? 'true' : 'false'}`);
    if (orderSaved) {
      safeLine(`LOCAL_ORDER_ID_FILE ${ORDER_ID_PATH}`);
    }
    if (urlSaved && envTruthy('STAGING_OPEN_CHECKOUT_BROWSER')) {
      openCheckoutUrlInBrowser(checkoutUrl);
      safeLine('LOCAL_BROWSER_OPEN_REQUESTED true');
    }
  }

  if (status !== 200) {
    printCodeMessage(json);
  }

  return { status, json, testSession, orderIdOk };
}

async function modeCheckout() {
  await runHostedCheckoutProbe({ persistForPhase2: false });
}

async function modeCheckoutOpenTest() {
  if (!envTruthy('STAGING_ALLOW_STRIPE_TEST_PAYMENT')) {
    safeLine('LOCAL_VALIDATION_ERROR staging_allow_stripe_test_payment_required');
    process.exitCode = 2;
    return;
  }
  safeLine('MODE checkout-open-test');
  const result = await runHostedCheckoutProbe({ persistForPhase2: true });
  if (result?.testSession === false && result?.status === 200) {
    safeLine('PHASE2_ABORT live_or_unknown_stripe_session');
  }
}

async function modeStatusCheck() {
  safeLine('MODE status-check');
  logSavedStateDebug();

  const token = await loadToken();
  printTokenFileDiagnostics(token);
  if (!token) {
    safeLine('LOCAL_ORDER_ID_PRESENT false');
    safeLine('ORDER_FOUND unknown');
    safeLine('LOCAL_ERROR TOKEN_MISSING_OR_EXPIRED');
    safeLine('ORDER_AUTH_FAILURE true');
    safeLine('ORDER_STATE_UNAVAILABLE true');
    process.exitCode = 2;
    return;
  }
  if (isAccessTokenExpired(token) === true) {
    safeLine('LOCAL_ORDER_ID_PRESENT false');
    safeLine('ORDER_FOUND unknown');
    safeLine('LOCAL_ERROR TOKEN_MISSING_OR_EXPIRED');
    safeLine('TOKEN_EXPIRED true');
    safeLine('ORDER_AUTH_FAILURE true');
    safeLine('ORDER_STATE_UNAVAILABLE true');
    process.exitCode = 2;
    return;
  }

  const orderId = await loadOrderId();
  safeLine(`LOCAL_ORDER_ID_PRESENT ${orderId ? 'true' : 'false'}`);
  if (orderId) {
    safeLine(`LOCAL_ORDER_ID_PREVIEW ${redactIdPreview(orderId)}`);
  }

  if (!orderId) {
    safeLine('ORDER_FOUND false');
    safeLine('LOCAL_ERROR missing_order_id_run_checkout_open_test');
    process.exitCode = 2;
    return;
  }

  const slimPath = `${STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX}${encodeURIComponent(orderId)}`;
  safeLine(`STATUS_CHECK_API_ORIGIN ${apiOriginOnly()}`);
  safeLine('STATUS_CHECK_HTTP_METHOD GET');
  safeLine(`STATUS_CHECK_ENDPOINT_PRIMARY ${slimPath}`);
  safeLine(`STATUS_CHECK_TIMEOUT_MS ${STATUS_CHECK_SLIM_TIMEOUT_MS}`);

  const slimResult = await apiGet(
    slimPath,
    { Authorization: `Bearer ${token}` },
    STATUS_CHECK_SLIM_TIMEOUT_MS,
  );

  safeLine(`STATUS_CHECK_RESPONSE_PREVIEW ${safeResponsePreview(slimResult)}`);

  if (slimResult.timedOut) {
    safeLine('STATUS_CHECK_HTTP timeout');
    safeLine(`STATUS_CHECK_TIMED_OUT_ENDPOINT ${slimPath}`);
    safeLine(
      `STATUS_CHECK_TIMEOUT_REASON slim_operator_status_exceeded_${STATUS_CHECK_SLIM_TIMEOUT_MS}ms`,
    );
    safeLine('ORDER_API_REACHED false');
    safeLine('ORDER_FOUND unknown');
    process.exitCode = 1;
    return;
  }

  safeLine(`STATUS_CHECK_HTTP ${slimResult.status}`);

  if (slimResult.status === 503 && slimResult.json?.reason === 'staging_operator_order_status_disabled') {
    safeLine('STATUS_CHECK_FALLBACK legacy_express_order_route');
    const legacyPath = `/api/orders/${encodeURIComponent(orderId)}`;
    safeLine(`STATUS_CHECK_ENDPOINT_FALLBACK ${legacyPath}`);
    safeLine(`STATUS_CHECK_TIMEOUT_MS ${STATUS_CHECK_LEGACY_TIMEOUT_MS}`);
    const legacy = await apiGet(
      legacyPath,
      { Authorization: `Bearer ${token}` },
      STATUS_CHECK_LEGACY_TIMEOUT_MS,
    );
    safeLine(`STATUS_CHECK_FALLBACK_RESPONSE_PREVIEW ${safeResponsePreview(legacy)}`);
    if (legacy.timedOut) {
      safeLine('STATUS_CHECK_HTTP timeout');
      safeLine(`STATUS_CHECK_TIMED_OUT_ENDPOINT ${legacyPath}`);
      safeLine(
        `STATUS_CHECK_TIMEOUT_REASON legacy_express_cold_start_exceeded_${STATUS_CHECK_LEGACY_TIMEOUT_MS}ms`,
      );
      safeLine('ORDER_API_REACHED false');
      safeLine('ORDER_FOUND unknown');
      safeLine('STATUS_CHECK_HINT deploy_slim_operator_order_status_and_set_STAGING_ALLOW_OPERATOR_ORDER_STATUS');
      process.exitCode = 1;
      return;
    }
    safeLine(`STATUS_CHECK_HTTP ${legacy.status}`);
    if (legacy.status !== 200 || !legacy.json?.order) {
      safeLine(`ORDER_FOUND ${legacy.status === 404 ? 'false' : 'unknown'}`);
      printCodeMessage(legacy.json);
      process.exitCode = 1;
      return;
    }
    const o = legacy.json.order;
    const lifecycle = String(o.orderStatus ?? 'unknown');
    const payment = String(o.status ?? 'unknown');
    const paidConfirmed =
      lifecycle === 'PAID' || lifecycle === 'PROCESSING' || lifecycle === 'FULFILLED';
    safeLine('ORDER_FOUND true');
    safeLine(`ORDER_STATUS ${lifecycle}`);
    safeLine(`PAYMENT_STATUS ${payment}`);
    safeLine(`PAID_CONFIRMED ${paidConfirmed ? 'true' : 'false'}`);
    safeLine('FULFILLMENT_ATTEMPT_COUNT unknown');
    safeLine('FULFILLMENT_DUPLICATE_SAFE unknown');
    return;
  }

  if (slimResult.status === 401 || slimResult.status === 403) {
    safeLine('ORDER_API_REACHED true');
    safeLine('ORDER_FOUND unknown');
    safeLine('LOCAL_ERROR TOKEN_REJECTED_BY_API');
    safeLine('ORDER_AUTH_FAILURE true');
    safeLine('ORDER_STATE_UNAVAILABLE true');
    safeLine(
      `TOKEN_LOCAL_STATE ${classifyStoredToken(token)}`,
    );
    printCodeMessage(slimResult.json);
    process.exitCode = 2;
    return;
  }

  if (slimResult.status === 404 || slimResult.json?.orderFound === false) {
    safeLine('ORDER_API_REACHED true');
    safeLine('ORDER_FOUND false');
    safeLine('ORDER_STATUS unknown');
    safeLine('PAYMENT_STATUS unknown');
    printCodeMessage(slimResult.json);
    process.exitCode = 1;
    return;
  }

  if (slimResult.status !== 200 || slimResult.json?.orderFound !== true) {
    safeLine('ORDER_API_REACHED true');
    safeLine('ORDER_FOUND unknown');
    printCodeMessage(slimResult.json);
    process.exitCode = 1;
    return;
  }

  const lifecycle = String(slimResult.json.orderStatus ?? 'unknown');
  const payment = String(slimResult.json.paymentStatus ?? 'unknown');
  const attemptCount = Number(slimResult.json.fulfillmentAttemptCount ?? 0);
  const paidConfirmed = slimResult.json.paidConfirmed === true;
  const duplicateSafe = slimResult.json.fulfillmentDuplicateSafe === true;

  safeLine('ORDER_FOUND true');
  safeLine(`ORDER_STATUS ${lifecycle}`);
  safeLine(`PAYMENT_STATUS ${payment}`);
  safeLine(`PAID_CONFIRMED ${paidConfirmed ? 'true' : 'false'}`);
  safeLine(
    `FULFILLMENT_ATTEMPT_COUNT ${Number.isFinite(attemptCount) ? attemptCount : 0}`,
  );
  safeLine(`FULFILLMENT_DUPLICATE_SAFE ${duplicateSafe ? 'true' : 'false'}`);
}

async function modePhase1TruthCheck() {
  safeLine('MODE phase1-truth-check');

  const token = await loadToken();
  printTokenFileDiagnostics(token);
  if (!token || isAccessTokenExpired(token) === true) {
    safeLine('PHASE1_TRUTH_HTTP 0');
    safeLine('LOCAL_ERROR TOKEN_MISSING_OR_EXPIRED');
    safeLine('ORDER_AUTH_FAILURE true');
    process.exitCode = 2;
    return;
  }

  const orderId = await loadOrderId();
  safeLine(`LOCAL_ORDER_ID_PRESENT ${orderId ? 'true' : 'false'}`);
  if (orderId) {
    safeLine(`LOCAL_ORDER_ID_PREVIEW ${redactIdPreview(orderId)}`);
  }
  if (!orderId) {
    safeLine('PHASE1_TRUTH_HTTP 0');
    safeLine('LOCAL_ERROR missing_order_id');
    process.exitCode = 2;
    return;
  }

  const slimPath = `${STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX}${encodeURIComponent(orderId)}`;
  safeLine(`PHASE1_TRUTH_API_ORIGIN ${apiOriginOnly()}`);
  safeLine('PHASE1_TRUTH_HTTP_METHOD GET');
  safeLine(`PHASE1_TRUTH_ENDPOINT_PRIMARY ${slimPath}`);
  safeLine(`PHASE1_TRUTH_TIMEOUT_MS ${PHASE1_TRUTH_SLIM_TIMEOUT_MS}`);

  const slimResult = await apiGet(
    slimPath,
    { Authorization: `Bearer ${token}` },
    PHASE1_TRUTH_SLIM_TIMEOUT_MS,
  );

  safeLine(`PHASE1_TRUTH_RESPONSE_PREVIEW ${safeResponsePreview(slimResult)}`);

  if (slimResult.timedOut) {
    safeLine('PHASE1_TRUTH_HTTP timeout');
    safeLine(`PHASE1_TRUTH_TIMED_OUT_ENDPOINT ${slimPath}`);
    safeLine(
      `PHASE1_TRUTH_TIMEOUT_REASON slim_operator_phase1_truth_exceeded_${PHASE1_TRUTH_SLIM_TIMEOUT_MS}ms`,
    );
    safeLine('ORDER_API_REACHED false');
    safeLine(
      'PHASE1_TRUTH_HINT deploy_slim_operator_phase1_truth_and_set_STAGING_ALLOW_OPERATOR_ORDER_STATUS',
    );
    process.exitCode = 1;
    return;
  }

  safeLine(`PHASE1_TRUTH_HTTP ${slimResult.status}`);

  if (
    slimResult.status === 503 &&
    slimResult.json?.reason === 'staging_operator_phase1_truth_disabled'
  ) {
    safeLine('PHASE1_TRUTH_SLIM_DISABLED true');
    safeLine(
      'PHASE1_TRUTH_HINT deploy_api_with_slim_phase1_truth_and_STAGING_ALLOW_OPERATOR_ORDER_STATUS_true',
    );
    safeLine(
      'PHASE1_TRUTH_NOTE legacy_GET_api_orders_phase1_truth_requires_full_express_bootstrap_and_may_timeout_on_cold_start',
    );
    process.exitCode = 1;
    return;
  }

  if (slimResult.status === 401) {
    safeLine('ORDER_API_REACHED true');
    safeLine('LOCAL_ERROR TOKEN_REJECTED_BY_API');
    safeLine('ORDER_AUTH_FAILURE true');
    printCodeMessage(slimResult.json);
    process.exitCode = 2;
    return;
  }

  if (slimResult.status === 404 || slimResult.json?.orderFound === false) {
    safeLine('ORDER_API_REACHED true');
    safeLine('ORDER_FOUND false');
    safeLine('POST_PAYMENT_INCIDENT_STATUS unknown');
    printCodeMessage(slimResult.json);
    process.exitCode = 1;
    return;
  }

  if (slimResult.status !== 200 || slimResult.json?.orderFound !== true) {
    safeLine('ORDER_API_REACHED true');
    safeLine('ORDER_FOUND unknown');
    printCodeMessage(slimResult.json);
    process.exitCode = 1;
    return;
  }

  const incident = String(slimResult.json.postPaymentIncidentStatus ?? 'unknown');
  const mapSource =
    slimResult.json.postPaymentIncidentMapSource != null
      ? String(slimResult.json.postPaymentIncidentMapSource)
      : 'null';
  const lifecycle = String(slimResult.json.orderStatus ?? 'unknown');
  const payment = String(slimResult.json.paymentStatus ?? 'unknown');

  safeLine('ORDER_FOUND true');
  safeLine(`ORDER_STATUS ${lifecycle}`);
  safeLine(`PAYMENT_STATUS ${payment}`);
  safeLine(`POST_PAYMENT_INCIDENT_STATUS ${incident}`);
  safeLine(`POST_PAYMENT_INCIDENT_MAP_SOURCE ${mapSource}`);
  safeLine(
    `PREFLIGHT_REFUND_ELIGIBLE ${incident !== 'REFUNDED' ? 'true' : 'false'}`,
  );
}

async function main() {
  loadOperatorDotenv(SERVER_ROOT);

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
    case 'checkout-open-test':
      await modeCheckoutOpenTest();
      break;
    case 'status-check':
      await modeStatusCheck();
      break;
    case 'auth-env-check':
      await modeAuthEnvCheck();
      break;
    case 'auth-check':
      await modeAuthCheck();
      break;
    case 'phase1-truth-check':
      await modePhase1TruthCheck();
      break;
    default:
      usage();
      process.exitCode = 1;
  }
}

const isCliEntry = Boolean(
  process.argv[1]?.includes('staging-auth-checkout-operator.mjs'),
);

export { resolveLoginCredentials };

if (isCliEntry) {
  main().catch((err) => {
    output.write(`FATAL ${err?.message ?? 'unknown'}\n`);
    process.exitCode = 1;
  });
}
