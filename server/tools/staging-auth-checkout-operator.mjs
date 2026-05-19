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
 *   node tools/staging-auth-checkout-operator.mjs l11-preflight
 *   node tools/staging-auth-checkout-operator.mjs staging-api-smoke
 *   node tools/staging-auth-checkout-operator.mjs l11-refund-target
 *   node tools/staging-auth-checkout-operator.mjs l11-stripe-diagnose
 *   node tools/staging-auth-checkout-operator.mjs l11-refund-execute
 *   node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
 *
 * PowerShell (one command per line — do not concatenate):
 *   cd .\server
 *   node tools\staging-auth-checkout-operator.mjs l11-preflight
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
import {
  OPERATOR_MODES_SET,
  operatorUsageLines,
  parseOperatorCliArgv,
  powershellSafeOneLiners,
  safeOperatorCommandLine,
} from './stagingOperatorCliSafety.mjs';
import {
  evaluateL11Preflight,
  L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX,
} from './stagingOperatorL11Preflight.mjs';
import {
  classifyStagingHttpResponse,
  responseLooksLikeNextHtml,
  ROUTE_DIAGNOSIS,
  STAGING_API_DEPLOY_RECOVERY_HINT,
} from './stagingOperatorRouteDiagnostics.mjs';
import {
  dbMappingFromRefundTargetApi,
  runL11PreflightEvaluation,
} from './stagingOperatorL11HarnessCore.mjs';
import {
  buildDashboardSearchHint,
  createFullPaymentIntentRefund,
  evaluateL11PostRefundVerify,
  evaluateL11RefundExecuteGuards,
  evaluateL11RefundTarget,
  idSuffix,
  isStripeTestModeSecret,
  L11_REFUND_APPROVAL_PHRASE,
  L11_TARGET_ORDER_ID,
  orderIdMatchesL11Target,
  refundApprovalPhraseMatches,
  stripeSecretKeyMode,
} from './stagingOperatorL11Refund.mjs';
import {
  diagnoseL11StripePayment,
  resolveStripePaymentForL11,
  rootCauseToBlockedReason,
  rootCauseToDiagnosticVerdict,
  ROOT_CAUSE,
} from './stagingOperatorL11StripeDiagnose.mjs';
import {
  pickBestL11RefundableCandidate,
  scoreL11RefundableCandidate,
} from './stagingOperatorL11Discover.mjs';
import { getValidatedStripeSecretKey } from '../src/config/stripeEnv.js';
import { getStripeClient } from '../src/services/stripe.js';
import {
  applyL11StripeKeyToProcessEnv,
  printL11StripeKeyDiagnosticLines,
  resolveL11OperatorStripeKey,
} from './stagingOperatorL11StripeKey.mjs';
import { retrieveStripeAccountSafe } from './stagingOperatorL11StripeDiagnose.mjs';

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
const STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX =
  '/api/ops/staging-operator-refund-target/';
const STAGING_OPERATOR_REFUNDABLE_CANDIDATES_PATH =
  '/api/ops/staging-operator-refundable-candidates';

const MODES = OPERATOR_MODES_SET;

/** Captured before `loadOperatorDotenv` — shell precedence for L-11 Stripe key. */
let l11StripeKeyBeforeDotenv;
/** @type {ReturnType<typeof resolveL11OperatorStripeKey> | null} */
let l11StripeKeyResolution = null;

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
  for (const line of operatorUsageLines()) {
    output.write(`${line}\n`);
  }
  for (const line of powershellSafeOneLiners()) {
    output.write(`${line}\n`);
  }
}

/**
 * @param {import('./stagingOperatorCliSafety.mjs').parseOperatorCliArgv extends (...args: any) => infer R ? Extract<R, { ok: false }> : never} parsed
 */
function failCliValidation(parsed) {
  if (parsed.error === 'command_concatenation_detected') {
    safeLine('LOCAL_VALIDATION_ERROR command_concatenation_detected');
    safeLine(`CONCAT_BASE_MODE ${parsed.baseMode ?? 'unknown'}`);
    safeLine(`CONCAT_GLUED_FRAGMENT ${parsed.glued ?? 'unknown'}`);
    safeLine('HINT run_one_command_per_line_use_semicolon_or_newline_in_powershell');
  } else if (parsed.error === 'missing_mode') {
    safeLine('LOCAL_VALIDATION_ERROR missing_mode');
  } else {
    safeLine('LOCAL_VALIDATION_ERROR unknown_mode');
  }
  safeLine(`NEXT_SAFE_COMMAND ${parsed.nextSafeCommand}`);
  for (const line of powershellSafeOneLiners()) {
    safeLine(line);
  }
  usage();
  process.exitCode = 1;
}

function printL11Blocked(reason, nextCommand) {
  safeLine(`BLOCKED_REASON ${reason}`);
  safeLine(`NEXT_SAFE_COMMAND ${nextCommand}`);
  safeLine('DO_NOT_REFUND true');
  safeLine('L11_PREFLIGHT_VERDICT BLOCKED');
  process.exitCode = 1;
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

/**
 * Gitignored local harness pointer only — never commit.
 * @param {string} orderId
 */
async function writeOrderIdLocal(orderId) {
  const id = String(orderId ?? '').trim();
  if (!id) return false;
  await writeFile(ORDER_ID_PATH, `${id}\n`, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') {
    await chmod(ORDER_ID_PATH, 0o600).catch(() => {});
  }
  return true;
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
      return { status: null, json: null, text: '', contentType: '', timedOut: true };
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

  const loginResult = await apiPost(LOGIN_API_PATH, {
    email: creds.email,
    password: creds.password,
  });
  const { status, json, timedOut, contentType, text } = loginResult;
  if (timedOut) {
    safeLine('LOGIN_HTTP timeout');
    safeLine('ROUTE_DIAGNOSIS timeout_cold_start_or_bootstrap');
    safeLine('TOKEN_OK false');
    safeLine('TOKEN_SAVED false');
    process.exitCode = 1;
    return;
  }
  safeLine(`LOGIN_HTTP ${status}`);
  safeLine(`LOGIN_RESPONSE_PREVIEW ${safeResponsePreview(loginResult)}`);

  const loginDx = classifyStagingHttpResponse({
    status,
    timedOut: false,
    contentType,
    text,
    json,
    path: LOGIN_API_PATH,
    method: 'POST',
  });
  safeLine(`ROUTE_DIAGNOSIS ${loginDx.diagnosis}`);
  safeLine(`API_SURFACE_LIKELY ${loginDx.apiSurfaceLikely}`);

  if (loginDx.diagnosis === ROUTE_DIAGNOSIS.ROUTE_MISSING_OR_WRONG_DEPLOYMENT) {
    safeLine('LOGIN_HINT wrong_vercel_deployment_nextjs_on_api_domain_not_credentials');
    safeLine(`NEXT_SAFE_COMMAND ${STAGING_API_DEPLOY_RECOVERY_HINT.command}`);
    safeLine(`DEPLOY_GUARD_RUN cd server; npm run deploy:staging:guard`);
    process.exitCode = 1;
    return;
  }

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

/**
 * Login without MODE banner (for l11-preflight token refresh).
 * @returns {Promise<{ ok: boolean, loginHttp: number | string, token: string }>}
 */
async function executeLoginCore() {
  const creds = await resolveLoginCredentials();
  if (!creds) {
    return { ok: false, loginHttp: 0, token: '' };
  }

  const { status, json, timedOut } = await apiPost(LOGIN_API_PATH, {
    email: creds.email,
    password: creds.password,
  });
  if (timedOut) {
    return { ok: false, loginHttp: 'timeout', token: '' };
  }

  const token = extractAccessToken(json);
  const saved = status === 200 && (await saveToken(token));
  return {
    ok: saved,
    loginHttp: status,
    token: saved ? token : '',
  };
}

/**
 * @returns {Promise<{ ok: boolean, token: string, loginHttp: number | string, blockedReason?: string }>}
 */
async function ensureOperatorToken({ verbose = false } = {}) {
  let token = await loadToken();
  const expired = !token || isAccessTokenExpired(token) === true;

  if (!expired) {
    if (verbose) {
      safeLine('TOKEN_REFRESH_SKIPPED true');
      safeLine('TOKEN_VALID true');
    }
    return { ok: true, token, loginHttp: 'skipped_valid_token' };
  }

  if (verbose) {
    safeLine('TOKEN_REFRESH_REQUIRED true');
    printTokenFileDiagnostics(token);
  }

  const d = credentialEnvDiagnostics(process.env);
  if (!d.hasEmail || !d.hasPassword) {
    return {
      ok: false,
      token: '',
      loginHttp: 0,
      blockedReason: 'token_expired_credentials_missing',
    };
  }

  if (verbose) {
    safeLine('LOGIN_ATTEMPT_FOR_TOKEN_REFRESH true');
  }

  const login = await executeLoginCore();
  if (verbose) {
    safeLine(`LOGIN_HTTP ${login.loginHttp}`);
  }

  if (!login.ok) {
    return {
      ok: false,
      token: '',
      loginHttp: login.loginHttp,
      blockedReason: 'token_refresh_login_failed',
    };
  }

  return { ok: true, token: login.token, loginHttp: login.loginHttp };
}

/**
 * Read-only status-check (slim primary, legacy fallback).
 * @param {string} token
 * @param {{ verbose?: boolean }} [options]
 */
async function runStatusCheckCore(token, { verbose = false } = {}) {
  const orderId = await loadOrderId();
  const base = {
    http: 0,
    orderFound: false,
    orderStatus: 'unknown',
    paymentStatus: 'unknown',
    paidConfirmed: false,
    fulfillmentAttemptCount: 0,
    endpoint: '',
    timedOut: false,
    orderIdPresent: Boolean(orderId),
  };

  if (!orderId) {
    return { ...base, blockedReason: 'missing_order_id' };
  }

  const slimPath = `${STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX}${encodeURIComponent(orderId)}`;
  base.endpoint = slimPath;

  if (verbose) {
    safeLine(`STATUS_CHECK_ENDPOINT_PRIMARY ${slimPath}`);
    safeLine(`STATUS_CHECK_TIMEOUT_MS ${STATUS_CHECK_SLIM_TIMEOUT_MS}`);
  }

  const slimResult = await apiGet(
    slimPath,
    { Authorization: `Bearer ${token}` },
    STATUS_CHECK_SLIM_TIMEOUT_MS,
  );

  if (slimResult.timedOut) {
    return {
      ...base,
      http: 'timeout',
      timedOut: true,
      blockedReason: 'status_check_timeout',
    };
  }

  base.http = slimResult.status;

  if (
    slimResult.status === 503 &&
    slimResult.json?.reason === 'staging_operator_order_status_disabled'
  ) {
    const legacyPath = `/api/orders/${encodeURIComponent(orderId)}`;
    base.endpoint = legacyPath;
    if (verbose) {
      safeLine(`STATUS_CHECK_ENDPOINT_FALLBACK ${legacyPath}`);
    }
    const legacy = await apiGet(
      legacyPath,
      { Authorization: `Bearer ${token}` },
      STATUS_CHECK_LEGACY_TIMEOUT_MS,
    );
    if (legacy.timedOut) {
      return {
        ...base,
        http: 'timeout',
        timedOut: true,
        blockedReason: 'status_check_legacy_timeout',
      };
    }
    base.http = legacy.status;
    if (legacy.status === 200 && legacy.json?.order) {
      const o = legacy.json.order;
      base.orderFound = true;
      base.orderStatus = String(o.orderStatus ?? o.status ?? 'unknown');
      base.paymentStatus = String(o.paymentStatus ?? o.status ?? 'unknown');
      base.paidConfirmed = o.paidConfirmed === true || o.paidAt != null;
      base.fulfillmentAttemptCount = Number(o.fulfillmentAttemptCount ?? 0);
    }
    return base;
  }

  if (slimResult.status === 200 && slimResult.json?.orderFound === true) {
    base.orderFound = true;
    base.orderStatus = String(slimResult.json.orderStatus ?? 'unknown');
    base.paymentStatus = String(slimResult.json.paymentStatus ?? 'unknown');
    base.paidConfirmed = slimResult.json.paidConfirmed === true;
    base.fulfillmentAttemptCount = Number(
      slimResult.json.fulfillmentAttemptCount ?? 0,
    );
  }

  return base;
}

/**
 * Read-only phase1-truth incident check (slim endpoint only).
 * @param {string} token
 * @param {{ verbose?: boolean }} [options]
 */
async function runPhase1TruthCheckCore(token, { verbose = false } = {}) {
  const orderId = await loadOrderId();
  const base = {
    http: 0,
    orderFound: false,
    postPaymentIncidentStatus: 'unknown',
    postPaymentIncidentMapSource: 'null',
    orderStatus: 'unknown',
    paymentStatus: 'unknown',
    endpoint: '',
    usedSlimPath: true,
    timedOut: false,
    orderIdPresent: Boolean(orderId),
  };

  if (!orderId) {
    return { ...base, blockedReason: 'missing_order_id' };
  }

  const slimPath = `${STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX}${encodeURIComponent(orderId)}`;
  base.endpoint = slimPath;

  if (verbose) {
    safeLine(`PHASE1_TRUTH_ENDPOINT_PRIMARY ${slimPath}`);
    safeLine(`PHASE1_TRUTH_TIMEOUT_MS ${PHASE1_TRUTH_SLIM_TIMEOUT_MS}`);
  }

  const slimResult = await apiGet(
    slimPath,
    { Authorization: `Bearer ${token}` },
    PHASE1_TRUTH_SLIM_TIMEOUT_MS,
  );

  if (slimResult.timedOut) {
    return {
      ...base,
      http: 'timeout',
      timedOut: true,
      blockedReason: 'phase1_truth_timeout',
    };
  }

  base.http = slimResult.status;

  if (slimResult.status === 200 && slimResult.json?.orderFound === true) {
    base.orderFound = true;
    base.postPaymentIncidentStatus = String(
      slimResult.json.postPaymentIncidentStatus ?? 'unknown',
    );
    base.postPaymentIncidentMapSource =
      slimResult.json.postPaymentIncidentMapSource != null
        ? String(slimResult.json.postPaymentIncidentMapSource)
        : 'null';
    base.orderStatus = String(slimResult.json.orderStatus ?? 'unknown');
    base.paymentStatus = String(slimResult.json.paymentStatus ?? 'unknown');
  }

  return base;
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

async function modeStagingApiSmoke() {
  safeLine('MODE staging-api-smoke');
  safeLine('DO_NOT_REFUND true');
  safeLine(`SMOKE_API_ORIGIN ${apiOriginOnly()}`);

  const probes = [
    { name: 'health', method: 'GET', path: '/api/health' },
    { name: 'index', method: 'GET', path: '/api/index' },
    {
      name: 'login_route',
      method: 'POST',
      path: LOGIN_API_PATH,
      body: {},
    },
    {
      name: 'operator_status_route',
      method: 'GET',
      path: `${STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX}cmp91xbrt0003jm04m9ub8wrw`,
    },
    {
      name: 'operator_phase1_truth_route',
      method: 'GET',
      path: `${STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX}cmp91xbrt0003jm04m9ub8wrw`,
    },
  ];

  let allPass = true;
  let wrongDeployment = false;

  for (const probe of probes) {
    const result =
      probe.method === 'POST'
        ? await apiPost(probe.path, probe.body ?? {})
        : await apiGet(probe.path, {}, 20_000);

    safeLine(`SMOKE_PROBE ${probe.name}`);
    safeLine(
      `SMOKE_HTTP ${result.timedOut ? 'timeout' : result.status ?? 'unknown'}`,
    );

    const dx = classifyStagingHttpResponse({
      status: result.status,
      timedOut: result.timedOut,
      contentType: result.contentType,
      text: result.text,
      json: result.json,
      path: probe.path,
      method: probe.method,
    });
    safeLine(`ROUTE_DIAGNOSIS ${dx.diagnosis}`);
    safeLine(`API_SURFACE_LIKELY ${dx.apiSurfaceLikely}`);

    if (dx.diagnosis === ROUTE_DIAGNOSIS.ROUTE_MISSING_OR_WRONG_DEPLOYMENT) {
      wrongDeployment = true;
      allPass = false;
      continue;
    }

    if (result.timedOut) {
      allPass = false;
      continue;
    }

    if (probe.name === 'health' || probe.name === 'index') {
      if (result.status !== 200) allPass = false;
    }

    if (probe.name === 'login_route') {
      if (
        dx.diagnosis !== ROUTE_DIAGNOSIS.VALIDATION_ERROR &&
        dx.diagnosis !== ROUTE_DIAGNOSIS.INVALID_CREDENTIALS &&
        dx.diagnosis !== ROUTE_DIAGNOSIS.OK &&
        dx.diagnosis !== ROUTE_DIAGNOSIS.OWNER_ONLY_OR_FORBIDDEN
      ) {
        allPass = false;
      }
    }

    if (
      probe.name === 'operator_status_route' ||
      probe.name === 'operator_phase1_truth_route'
    ) {
      if (
        dx.diagnosis !== ROUTE_DIAGNOSIS.AUTH_REQUIRED &&
        dx.diagnosis !== ROUTE_DIAGNOSIS.SERVICE_DISABLED &&
        dx.diagnosis !== ROUTE_DIAGNOSIS.OK &&
        result.status !== 404
      ) {
        if (result.status === 404 && !responseLooksLikeNextHtml(result.contentType, result.text)) {
          /* API 404 invalid id is acceptable */
        } else if (dx.diagnosis === ROUTE_DIAGNOSIS.UNKNOWN && result.status === 404) {
          /* ok */
        } else if (result.status !== 401 && result.status !== 503 && result.status !== 400) {
          allPass = false;
        }
      }
    }
  }

  if (wrongDeployment) {
    safeLine('STAGING_API_SMOKE_VERDICT FAIL');
    safeLine('BLOCKED_REASON route_missing_or_wrong_deployment');
    safeLine(`NEXT_SAFE_COMMAND ${STAGING_API_DEPLOY_RECOVERY_HINT.command}`);
    safeLine('DEPLOY_REQUIRED true');
    safeLine('DO_NOT_REFUND true');
    process.exitCode = 1;
    return;
  }

  if (allPass) {
    safeLine('STAGING_API_SMOKE_VERDICT PASS');
    safeLine('API_SURFACE_LIKELY api_serverless');
    process.exitCode = 0;
    return;
  }

  safeLine('STAGING_API_SMOKE_VERDICT FAIL');
  safeLine('BLOCKED_REASON staging_api_probe_failed');
  safeLine(`NEXT_SAFE_COMMAND ${STAGING_API_DEPLOY_RECOVERY_HINT.command}`);
  process.exitCode = 1;
}

function readStripeSecretForL11() {
  ensureL11StripeKeyResolved();
  return getValidatedStripeSecretKey();
}

function ensureL11StripeKeyResolved() {
  if (!l11StripeKeyResolution) {
    l11StripeKeyResolution = resolveL11OperatorStripeKey({
      serverRoot: SERVER_ROOT,
      stripeKeyBeforeDotenv: l11StripeKeyBeforeDotenv,
    });
    applyL11StripeKeyToProcessEnv(l11StripeKeyResolution);
  }
  return l11StripeKeyResolution;
}

/**
 * @param {string} verdictPrefix e.g. DISCOVER_VERDICT
 * @returns {{ stripe: import('stripe').Stripe, secretRaw: string, resolution: ReturnType<typeof resolveL11OperatorStripeKey> } | null}
 */
function requireL11TestStripeKey(verdictPrefix) {
  const resolution = ensureL11StripeKeyResolved();
  for (const [key, value] of printL11StripeKeyDiagnosticLines(resolution)) {
    safeLine(`${key} ${value}`);
  }

  const testOk =
    resolution.keyMode === 'test_secret' ||
    resolution.keyMode === 'test_restricted';

  if (!testOk) {
    safeLine(`${verdictPrefix} BLOCKED`);
    if (resolution.keyMode === 'live_blocked') {
      safeLine('KEY_MODE live_blocked');
    }
    safeLine(`ROOT_CAUSE_CODE ${resolution.rootCauseCode}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-key-diagnose')}`);
    process.exitCode = 1;
    return null;
  }

  const stripe = getStripeClient();
  if (!stripe || !resolution.effectiveKey) {
    safeLine(`${verdictPrefix} BLOCKED`);
    safeLine('ROOT_CAUSE_CODE stripe_key_missing');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-key-diagnose')}`);
    process.exitCode = 1;
    return null;
  }

  return {
    stripe,
    secretRaw: resolution.effectiveKey,
    resolution,
  };
}

function readStripeSecretRawForL11() {
  const resolution = ensureL11StripeKeyResolved();
  return resolution.effectiveKey ?? '';
}

async function fetchRefundTargetFromApi(token, orderId) {
  const path = `${STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX}${encodeURIComponent(orderId)}`;
  return apiGet(path, { Authorization: `Bearer ${token}` }, PHASE1_TRUTH_SLIM_TIMEOUT_MS);
}

/**
 * @param {{ verbose?: boolean, requireCanonicalTarget?: boolean }} [options]
 */
async function runL11PreflightCore(options = {}) {
  const verbose = options.verbose === true;
  const requireCanonicalTarget = options.requireCanonicalTarget === true;
  const orderId = await loadOrderId();
  if (!orderId) {
    return { pass: false, blockedReason: 'missing_order_id', orderId: '' };
  }
  if (requireCanonicalTarget && !orderIdMatchesL11Target(orderId)) {
    return {
      pass: false,
      blockedReason: 'order_id_not_l11_target',
      orderId,
    };
  }

  const tokenResult = await ensureOperatorToken({ verbose });
  if (!tokenResult.ok) {
    return {
      pass: false,
      blockedReason: tokenResult.blockedReason ?? 'token_unavailable',
      orderId,
    };
  }

  const { evaluation } = await runL11PreflightEvaluation({
    orderId,
    token: tokenResult.token,
    loginHttp: tokenResult.loginHttp,
    runStatusCheckCore,
    runPhase1TruthCheckCore,
    phase1TruthPrefix: L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX,
    verbose,
  });

  return {
    pass: evaluation.pass,
    blockedReason: evaluation.blockedReason,
    orderId,
    token: tokenResult.token,
    loginHttp: tokenResult.loginHttp,
    evaluation,
  };
}

/**
 * @param {string} orderId
 * @param {ReturnType<typeof dbMappingFromRefundTargetApi>} db
 */
async function resolveStripeMappingForOrder(orderId, db) {
  const secret = readStripeSecretForL11();
  if (!secret) {
    return {
      verified: false,
      reason: ROOT_CAUSE.STRIPE_KEY_MISSING,
      blockedReason: 'stripe_key_missing',
    };
  }
  if (!isStripeTestModeSecret(secret)) {
    const blockedReason =
      stripeSecretKeyMode(secret) === 'live'
        ? 'stripe_key_not_test'
        : 'stripe_key_not_test';
    return {
      verified: false,
      reason: ROOT_CAUSE.STRIPE_KEY_NOT_TEST,
      blockedReason,
    };
  }
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      verified: false,
      reason: ROOT_CAUSE.STRIPE_KEY_MISSING,
      blockedReason: 'stripe_key_missing',
    };
  }
  try {
    const mapped = await resolveStripePaymentForL11(stripe, {
      orderId,
      paymentIntentIdForVerify: db.paymentIntentIdForVerify,
      stripePaymentIntentIdSuffix: db.stripePaymentIntentIdSuffix,
      amountUsdCents: db.amountUsdCents,
      currency: db.currency,
      checkoutSessionIdForVerify: db.checkoutSessionIdForVerify,
    });
    if (!mapped.verified) {
      return {
        verified: false,
        reason: mapped.reason,
        blockedReason:
          mapped.blockedReason ??
          rootCauseToBlockedReason(mapped.reason) ??
          'stripe_verification_logic_bug',
      };
    }
    if (mapped.partialRefundExists) {
      return {
        verified: false,
        reason: ROOT_CAUSE.STRIPE_PARTIAL_REFUND_EXISTS,
        blockedReason: 'stripe_refund_already_exists',
      };
    }
    return mapped;
  } catch (err) {
    return {
      verified: false,
      reason: String(err?.code ?? err?.message ?? 'stripe_lookup_failed'),
      blockedReason: 'stripe_verification_logic_bug',
    };
  }
}

function printL11StripeDiagnoseLines(diag, verdict) {
  safeLine(`L11_STRIPE_DIAG_VERDICT ${verdict}`);
  safeLine(`STRIPE_KEY_PRESENT ${diag.stripeKeyPresent ? 'true' : 'false'}`);
  safeLine(`STRIPE_KEY_PREFIX_TEST ${diag.stripeKeyPrefixTest ? 'true' : 'false'}`);
  safeLine(`STRIPE_ACCOUNT_REACHABLE ${diag.stripeAccountReachable ? 'true' : 'false'}`);
  safeLine(`STRIPE_ACCOUNT_ID_SUFFIX ${diag.stripeAccountIdSuffix}`);
  safeLine(`STRIPE_ACCOUNT_MODE ${diag.stripeAccountMode}`);
  safeLine(`PAYMENT_INTENT_ID_PRESENT ${diag.paymentIntentIdPresent ? 'true' : 'false'}`);
  safeLine(
    `PAYMENT_INTENT_RETRIEVE_BY_FULL_ID ${diag.paymentIntentRetrieveByFullId ? 'true' : 'false'}`,
  );
  safeLine(
    `PAYMENT_INTENT_SEARCH_BY_METADATA ${diag.paymentIntentSearchByMetadata ? 'true' : 'false'}`,
  );
  safeLine(`PAYMENT_INTENT_SUFFIX_MATCH ${diag.paymentIntentSuffixMatch ? 'true' : 'false'}`);
  safeLine(`STRONG_PI_ID_PROOF ${diag.strongPiIdProof ? 'true' : 'false'}`);
  safeLine(
    `METADATA_WARNING_STRONG_PI_PROOF ${diag.metadataWarningStrongPiProof ? 'true' : 'false'}`,
  );
  safeLine(`STALE_DB_PI_SUFFIX ${diag.staleDbPiSuffix ? 'true' : 'false'}`);
  safeLine(`CHARGE_ID_PRESENT ${diag.chargeIdPresent ? 'true' : 'false'}`);
  safeLine(`CHARGE_RETRIEVE_OK ${diag.chargeRetrieveOk ? 'true' : 'false'}`);
  safeLine(`AMOUNT_MATCH ${diag.amountMatch ? 'true' : 'false'}`);
  safeLine(`CURRENCY_MATCH ${diag.currencyMatch ? 'true' : 'false'}`);
  safeLine(`LIVEMODE_FALSE ${diag.livemodeFalse ? 'true' : 'false'}`);
  safeLine(`REFUND_ALREADY_EXISTS ${diag.refundAlreadyExists ? 'true' : 'false'}`);
  safeLine(`ROOT_CAUSE_CODE ${diag.rootCauseCode}`);
}

/**
 * @param {import('./stagingOperatorL11StripeMapping.mjs').evaluateDbStripeMapping extends (...args: any) => infer R ? R : never} mapping
 * @param {string} orderId
 * @param {{
 *   orderStatus?: string,
 *   paymentStatus?: string,
 *   paidConfirmed?: boolean,
 *   fulfillmentAttemptCount?: number,
 * }} status
 */
function printL11MappingDiagnoseLines(mapping, orderId, status = {}) {
  safeLine(`ORDER_ID_SUFFIX ${idSuffix(orderId)}`);
  safeLine(`ORDER_STATUS ${status.orderStatus ?? 'unknown'}`);
  safeLine(`PAYMENT_STATUS ${status.paymentStatus ?? 'unknown'}`);
  safeLine(`PAID_CONFIRMED ${status.paidConfirmed === true ? 'true' : 'false'}`);
  safeLine(
    `FULFILLMENT_ATTEMPT_COUNT ${status.fulfillmentAttemptCount ?? 'unknown'}`,
  );
  safeLine(`INTERNAL_CHECKOUT_ID_SUFFIX ${mapping.internalCheckoutIdSuffix}`);
  safeLine(`CHECKOUT_SESSION_ID_SUFFIX ${mapping.checkoutSessionIdSuffix}`);
  safeLine(`DB_PAYMENT_INTENT_ID_SUFFIX ${mapping.dbPiSuffixDisplay}`);
  safeLine(`STRIPE_PAYMENT_INTENT_ID_SUFFIX ${mapping.piSuffixDisplay}`);
  safeLine(`STRIPE_CHARGE_ID_SUFFIX ${mapping.chargeIdSuffix}`);
  safeLine(
    `STRIPE_METADATA_KEYS_PRESENT ${mapping.stripeMetadataKeysPresent.length > 0 ? mapping.stripeMetadataKeysPresent.join(',') : 'none'}`,
  );
  safeLine(
    `STRIPE_METADATA_INTERNAL_CHECKOUT_MATCH ${mapping.piInternalMatch || mapping.sessionInternalMatch ? 'true' : 'false'}`,
  );
  safeLine(`STRIPE_METADATA_ORDER_ID_MATCH ${mapping.orderIdMetaMatch ? 'true' : 'false'}`);
  safeLine(
    `STRIPE_METADATA_CHECKOUT_SESSION_MATCH ${mapping.stripeMetadataCheckoutSessionMatch ? 'true' : 'false'}`,
  );
  safeLine(
    `DB_TO_STRIPE_MAPPING_VERDICT ${mapping.linkageOk ? 'PASS' : mapping.staleDbPiSuffix ? 'STALE_SUFFIX' : 'BLOCKED'}`,
  );
  safeLine(`ROOT_CAUSE_CODE ${mapping.rootCauseCode}`);
}

/**
 * @param {import('./stagingOperatorL11StripeMapping.mjs').evaluateDbStripeMapping extends (...args: any) => infer R ? R : never} mapping
 * @param {string} orderId
 */
function printL11DbStripeMappingLines(mapping, orderId) {
  safeLine(`ORDER_ID_SUFFIX ${idSuffix(orderId)}`);
  safeLine(`INTERNAL_CHECKOUT_ID_SUFFIX ${mapping.internalCheckoutIdSuffix}`);
  safeLine(`CHECKOUT_SESSION_ID_SUFFIX ${mapping.checkoutSessionIdSuffix}`);
  safeLine(`DB_PAYMENT_INTENT_ID_SUFFIX ${mapping.dbPiSuffixDisplay}`);
  safeLine(`STRIPE_PAYMENT_INTENT_ID_SUFFIX ${mapping.piSuffixDisplay}`);
  safeLine(`STRIPE_CHARGE_ID_SUFFIX ${mapping.chargeIdSuffix}`);
  safeLine(
    `STRIPE_METADATA_KEYS_PRESENT ${mapping.stripeMetadataKeysPresent.length > 0 ? mapping.stripeMetadataKeysPresent.join(',') : 'none'}`,
  );
  safeLine(
    `STRIPE_METADATA_INTERNAL_CHECKOUT_MATCH ${mapping.piInternalMatch || mapping.sessionInternalMatch ? 'true' : 'false'}`,
  );
  safeLine(`STRIPE_METADATA_ORDER_ID_MATCH ${mapping.orderIdMetaMatch ? 'true' : 'false'}`);
  safeLine(
    `STRIPE_HOSTED_CHECKOUT_LINKAGE ${mapping.hostedCheckoutLinkage ? 'true' : 'false'}`,
  );
  safeLine(`DB_TO_STRIPE_MAPPING_VERDICT ${mapping.linkageOk ? 'PASS' : 'BLOCKED'}`);
  safeLine(`ROOT_CAUSE_CODE ${mapping.rootCauseCode}`);
}

async function modeL11DbStripeMapping() {
  safeLine('MODE l11-db-stripe-mapping');
  safeLine('CANONICAL_MODE l11-db-stripe-mapping');
  safeLine('DO_NOT_REFUND true');

  const pre = await runL11PreflightCore({ verbose: false, requireCanonicalTarget: false });
  if (!pre.pass) {
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const targetRes = await fetchRefundTargetFromApi(pre.token, pre.orderId);
  if (targetRes.status !== 200 || targetRes.json?.orderFound !== true) {
    safeLine('DB_TO_STRIPE_MAPPING_VERDICT BLOCKED');
    safeLine('ROOT_CAUSE_CODE stripe_payment_intent_not_found');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
    process.exitCode = 1;
    return;
  }

  const db = dbMappingFromRefundTargetApi(targetRes.json);
  const stripe = getStripeClient();
  if (!stripe || !readStripeSecretForL11()) {
    safeLine('DB_TO_STRIPE_MAPPING_VERDICT BLOCKED');
    safeLine('ROOT_CAUSE_CODE stripe_key_missing');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-stripe-diagnose')}`);
    process.exitCode = 1;
    return;
  }

  const piId = db.paymentIntentIdForVerify;
  if (!piId.startsWith('pi_')) {
    safeLine('DB_TO_STRIPE_MAPPING_VERDICT BLOCKED');
    safeLine('ROOT_CAUSE_CODE stripe_payment_intent_not_found');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
    process.exitCode = 1;
    return;
  }

  const { retrievePaymentIntentSafe } = await import(
    './stagingOperatorL11StripeDiagnose.mjs'
  );
  const { retrieveCheckoutSessionSafe, evaluateDbStripeMapping } = await import(
    './stagingOperatorL11StripeMapping.mjs'
  );

  const retrieved = await retrievePaymentIntentSafe(stripe, piId);
  if (!retrieved.ok || !retrieved.pi) {
    safeLine('DB_TO_STRIPE_MAPPING_VERDICT BLOCKED');
    safeLine('ROOT_CAUSE_CODE stripe_payment_intent_not_found');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
    process.exitCode = 1;
    return;
  }

  let checkoutSession = null;
  if (db.checkoutSessionIdForVerify.startsWith('cs_')) {
    const cs = await retrieveCheckoutSessionSafe(stripe, db.checkoutSessionIdForVerify);
    checkoutSession = cs.ok ? cs.session : null;
  }

  const mapping = evaluateDbStripeMapping({
    pi: retrieved.pi,
    orderId: pre.orderId,
    expectedPiSuffix: db.stripePaymentIntentIdSuffix,
    paymentIntentIdForVerify: db.paymentIntentIdForVerify,
    checkoutSession,
  });

  printL11DbStripeMappingLines(mapping, pre.orderId);
  if (mapping.linkageOk) {
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-stripe-diagnose')}`);
    process.exitCode = 0;
    return;
  }

  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-db-stripe-mapping')}`);
  process.exitCode = 1;
}

async function modeL11KeyDiagnose() {
  safeLine('MODE l11-key-diagnose');
  safeLine('CANONICAL_MODE l11-key-diagnose');
  safeLine('DO_NOT_REFUND true');

  const resolution = ensureL11StripeKeyResolved();
  for (const [key, value] of printL11StripeKeyDiagnosticLines(resolution)) {
    safeLine(`${key} ${value}`);
  }

  const testOk =
    resolution.keyMode === 'test_secret' ||
    resolution.keyMode === 'test_restricted';

  if (resolution.keyMode === 'live_blocked') {
    safeLine('KEY_MODE live_blocked');
  }

  if (!testOk) {
    safeLine('L11_KEY_DIAG_VERDICT BLOCKED');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-key-diagnose')}`);
    safeLine('HINT set sk_test or rk_test in server/.env.local or stripe_secret.key; never commit keys');
    process.exitCode = 1;
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    safeLine('STRIPE_ACCOUNT_REACHABLE false');
    safeLine('L11_KEY_DIAG_VERDICT BLOCKED');
    safeLine('ROOT_CAUSE_CODE stripe_key_missing');
    process.exitCode = 1;
    return;
  }

  const acct = await retrieveStripeAccountSafe(stripe);
  safeLine(`STRIPE_ACCOUNT_REACHABLE ${acct.reachable ? 'true' : 'false'}`);
  safeLine(
    `STRIPE_ACCOUNT_MODE ${acct.reachable ? (acct.livemode ? 'live_blocked' : 'test_only') : 'unknown'}`,
  );

  if (!acct.reachable || acct.livemode) {
    safeLine('L11_KEY_DIAG_VERDICT BLOCKED');
    safeLine(`ROOT_CAUSE_CODE ${acct.livemode ? 'stripe_key_not_test' : 'stripe_account_unreachable'}`);
    process.exitCode = 1;
    return;
  }

  safeLine('L11_KEY_DIAG_VERDICT PASS');
  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
  process.exitCode = 0;
}

async function modeL11DiscoverRefundableOrder() {
  safeLine('MODE l11-discover-refundable-order');
  safeLine('CANONICAL_MODE l11-discover-refundable-order');
  safeLine('DO_NOT_REFUND true');

  const pre = await runL11PreflightCore({ verbose: false, requireCanonicalTarget: false });
  if (!pre.pass) {
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const stripeCtx = requireL11TestStripeKey('DISCOVER_VERDICT');
  if (!stripeCtx) return;
  const { stripe, secretRaw } = stripeCtx;

  const res = await apiGet(
    STAGING_OPERATOR_REFUNDABLE_CANDIDATES_PATH,
    { Authorization: `Bearer ${pre.token}` },
    PHASE1_TRUTH_SLIM_TIMEOUT_MS,
  );
  safeLine(`REFUNDABLE_CANDIDATES_HTTP ${res.timedOut ? 'timeout' : res.status}`);

  if (res.status !== 200) {
    safeLine('DISCOVER_VERDICT BLOCKED');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const list = Array.isArray(res.json?.candidates) ? res.json.candidates : [];
  safeLine(`CANDIDATE_COUNT ${list.length}`);

  const scored = [];
  for (const c of list) {
    scored.push(await scoreL11RefundableCandidate(stripe, c, secretRaw));
  }

  for (let i = 0; i < scored.length; i += 1) {
    const s = scored[i];
    const n = i + 1;
    safeLine(`CANDIDATE_${n}_ORDER_ID_SUFFIX ${s.orderIdSuffix}`);
    safeLine(`CANDIDATE_${n}_DIAGNOSTIC_VERDICT ${s.diagnosticVerdict}`);
    safeLine(`CANDIDATE_${n}_ROOT_CAUSE_CODE ${s.rootCauseCode}`);
    safeLine(`CANDIDATE_${n}_STRONG_PI_ID_PROOF ${s.strongPiIdProof ? 'true' : 'false'}`);
  }

  const best = pickBestL11RefundableCandidate(scored);
  if (!best) {
    safeLine('DISCOVER_VERDICT NO_ELIGIBLE_CANDIDATE');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  safeLine(`BEST_CANDIDATE_ORDER_ID_SUFFIX ${best.orderIdSuffix}`);
  safeLine(`BEST_CANDIDATE_DIAGNOSTIC_VERDICT ${best.diagnosticVerdict}`);
  safeLine(`BEST_CANDIDATE_ROOT_CAUSE_CODE ${best.rootCauseCode}`);
  safeLine('DISCOVER_VERDICT CANDIDATE_FOUND');
  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-refresh-order-ref')}`);
  process.exitCode = 0;
}

async function modeL11RefreshOrderRef() {
  safeLine('MODE l11-refresh-order-ref');
  safeLine('CANONICAL_MODE l11-refresh-order-ref');
  safeLine('DO_NOT_REFUND true');

  const pre = await runL11PreflightCore({ verbose: false, requireCanonicalTarget: false });
  if (!pre.pass) {
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const stripeCtx = requireL11TestStripeKey('REFRESH_VERDICT');
  if (!stripeCtx) return;
  const { stripe, secretRaw } = stripeCtx;

  const res = await apiGet(
    STAGING_OPERATOR_REFUNDABLE_CANDIDATES_PATH,
    { Authorization: `Bearer ${pre.token}` },
    PHASE1_TRUTH_SLIM_TIMEOUT_MS,
  );
  if (res.status !== 200) {
    safeLine('REFRESH_VERDICT BLOCKED');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
    process.exitCode = 1;
    return;
  }

  const list = Array.isArray(res.json?.candidates) ? res.json.candidates : [];
  const scored = [];
  for (const c of list) {
    scored.push(await scoreL11RefundableCandidate(stripe, c, secretRaw));
  }
  const best = pickBestL11RefundableCandidate(scored);
  if (!best?.orderId) {
    safeLine('REFRESH_VERDICT BLOCKED');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
    process.exitCode = 1;
    return;
  }

  await writeOrderIdLocal(best.orderId);
  safeLine(`ORDER_ID_SUFFIX ${best.orderIdSuffix}`);
  safeLine(`REFRESH_VERDICT UPDATED_LOCAL_REF_ONLY`);
  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-mapping-diagnose')}`);
  process.exitCode = 0;
}

async function modeL11MappingDiagnose() {
  safeLine('MODE l11-mapping-diagnose');
  safeLine('CANONICAL_MODE l11-mapping-diagnose');
  safeLine('DO_NOT_REFUND true');

  const pre = await runL11PreflightCore({ verbose: false, requireCanonicalTarget: false });
  if (!pre.pass) {
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const targetRes = await fetchRefundTargetFromApi(pre.token, pre.orderId);
  if (targetRes.status !== 200 || targetRes.json?.orderFound !== true) {
    safeLine('DB_TO_STRIPE_MAPPING_VERDICT BLOCKED');
    safeLine('ROOT_CAUSE_CODE stripe_payment_intent_not_found');
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
    process.exitCode = 1;
    return;
  }

  const db = dbMappingFromRefundTargetApi(targetRes.json);
  const secretRaw = readStripeSecretRawForL11();
  const stripe = getStripeClient();
  const diag = await diagnoseL11StripePayment({
    secretRaw,
    db: {
      orderId: pre.orderId,
      paymentIntentIdForVerify: db.paymentIntentIdForVerify,
      stripePaymentIntentIdSuffix: db.stripePaymentIntentIdSuffix,
      amountUsdCents: db.amountUsdCents,
      currency: db.currency,
      checkoutSessionIdForVerify: db.checkoutSessionIdForVerify,
    },
    stripe,
  });

  const status = await runStatusCheckCore(pre.token, { verbose: false });

  if (diag.mapping) {
    printL11MappingDiagnoseLines(diag.mapping, pre.orderId, {
      orderStatus: db.orderStatus,
      paymentStatus: db.paymentStatus,
      paidConfirmed: db.paidConfirmed,
      fulfillmentAttemptCount: status.fulfillmentAttemptCount,
    });
  }

  const diagnosticVerdict = rootCauseToDiagnosticVerdict(diag.rootCauseCode);
  const ready =
    diagnosticVerdict === 'PASS' ||
    diagnosticVerdict === 'PASS_WITH_METADATA_WARNING';
  safeLine(`L11_MAPPING_DIAG_VERDICT ${ready ? diagnosticVerdict : 'BLOCKED'}`);
  if (ready) {
    safeLine(
      `L11_READINESS ${diagnosticVerdict === 'PASS' ? 'READY_FOR_OPERATOR_APPROVAL' : 'READY_WITH_METADATA_WARNING'}`,
    );
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-refund-target')}`);
    process.exitCode = 0;
    return;
  }

  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
  process.exitCode = 1;
}

async function modeL11StripeDiagnose() {
  safeLine('MODE l11-stripe-diagnose');
  safeLine('CANONICAL_MODE l11-stripe-diagnose');
  safeLine('DO_NOT_REFUND true');

  const pre = await runL11PreflightCore({ verbose: false, requireCanonicalTarget: false });
  safeLine(`L11_PREFLIGHT_VERDICT ${pre.pass ? 'PASS' : 'BLOCKED'}`);
  if (!pre.pass) {
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const targetRes = await fetchRefundTargetFromApi(pre.token, pre.orderId);
  safeLine(`REFUND_TARGET_HTTP ${targetRes.timedOut ? 'timeout' : targetRes.status}`);
  if (targetRes.status !== 200 || targetRes.json?.orderFound !== true) {
    printL11StripeDiagnoseLines(
      {
        stripeKeyPresent: Boolean(readStripeSecretForL11()),
        stripeKeyPrefixTest: isStripeTestModeSecret(readStripeSecretForL11()),
        stripeAccountReachable: false,
        stripeAccountIdSuffix: 'unknown',
        stripeAccountMode: 'unknown',
        paymentIntentIdPresent: false,
        paymentIntentRetrieveByFullId: false,
        paymentIntentSearchByMetadata: false,
        paymentIntentSuffixMatch: false,
        chargeIdPresent: false,
        chargeRetrieveOk: false,
        amountMatch: false,
        currencyMatch: false,
        livemodeFalse: false,
        refundAlreadyExists: false,
        rootCauseCode: ROOT_CAUSE.STRIPE_PAYMENT_INTENT_NOT_FOUND,
      },
      'BLOCKED',
    );
    safeLine('NEXT_SAFE_COMMAND node tools/staging-auth-checkout-operator.mjs l11-stripe-diagnose');
    process.exitCode = 1;
    return;
  }

  const db = dbMappingFromRefundTargetApi(targetRes.json);
  const secretRaw = readStripeSecretRawForL11();
  const stripe = getStripeClient();
  const diag = await diagnoseL11StripePayment({
    secretRaw,
    db: {
      orderId: pre.orderId,
      paymentIntentIdForVerify: db.paymentIntentIdForVerify,
      stripePaymentIntentIdSuffix: db.stripePaymentIntentIdSuffix,
      amountUsdCents: db.amountUsdCents,
      currency: db.currency,
      checkoutSessionIdForVerify: db.checkoutSessionIdForVerify,
    },
    stripe,
  });

  const diagnosticVerdict = rootCauseToDiagnosticVerdict(diag.rootCauseCode);
  const ready =
    diagnosticVerdict === 'PASS' ||
    diagnosticVerdict === 'PASS_WITH_METADATA_WARNING';
  printL11StripeDiagnoseLines(
    diag,
    ready ? diagnosticVerdict : 'BLOCKED',
  );
  if (diag.mapping) {
    printL11DbStripeMappingLines(diag.mapping, pre.orderId);
  }
  if (diag.stripePermissionCapability && diag.stripePermissionCapability !== 'none') {
    safeLine(`STRIPE_PERMISSION_CAPABILITY ${diag.stripePermissionCapability}`);
  }

  if (ready) {
    safeLine(
      `L11_READINESS ${diagnosticVerdict === 'PASS' ? 'READY_FOR_OPERATOR_APPROVAL' : 'READY_WITH_METADATA_WARNING'}`,
    );
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-refund-target')}`);
    process.exitCode = 0;
    return;
  }

  if (diag.rootCauseCode === ROOT_CAUSE.STALE_DB_PAYMENT_INTENT_SUFFIX) {
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-discover-refundable-order')}`);
  } else {
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-mapping-diagnose')}`);
  }
  process.exitCode = 1;
}

async function modeL11RefundTarget() {
  safeLine('MODE l11-refund-target');
  safeLine('CANONICAL_MODE l11-refund-target');
  safeLine('DO_NOT_REFUND true');

  const pre = await runL11PreflightCore({ verbose: false, requireCanonicalTarget: false });
  safeLine(`L11_PREFLIGHT_VERDICT ${pre.pass ? 'PASS' : 'BLOCKED'}`);
  if (!pre.pass) {
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-preflight')}`);
    process.exitCode = 1;
    return;
  }

  const targetRes = await fetchRefundTargetFromApi(pre.token, pre.orderId);
  safeLine(`REFUND_TARGET_HTTP ${targetRes.timedOut ? 'timeout' : targetRes.status}`);
  if (targetRes.status !== 200 || targetRes.json?.orderFound !== true) {
    safeLine('L11_REFUND_TARGET_VERDICT BLOCKED');
    safeLine('BLOCKED_REASON refund_target_api_failed');
    process.exitCode = 1;
    return;
  }

  const db = dbMappingFromRefundTargetApi(targetRes.json);
  let stripe = null;
  const secret = readStripeSecretForL11();
  if (secret && isStripeTestModeSecret(secret)) {
    stripe = await resolveStripeMappingForOrder(pre.orderId, db);
    if (stripe.verified) {
      safeLine('STRIPE_LOCAL_VERIFY true');
      safeLine(`STRIPE_MODE ${stripe.stripeMode}`);
    } else {
      safeLine('STRIPE_LOCAL_VERIFY false');
      safeLine(`STRIPE_LOCAL_VERIFY_REASON ${stripe.blockedReason ?? stripe.reason ?? 'unknown'}`);
    }
  } else {
    safeLine('STRIPE_LOCAL_VERIFY false');
    safeLine('STRIPE_LOCAL_VERIFY_REASON stripe_key_missing');
    stripe = { verified: false, blockedReason: 'stripe_key_missing' };
  }

  const evaluation = evaluateL11RefundTarget(
    {
      preflightPass: true,
      orderId: pre.orderId,
      db,
      stripe: stripe?.verified
        ? stripe
        : { verified: false, blockedReason: stripe?.blockedReason ?? 'stripe_key_missing' },
    },
    { requireCanonicalTarget: false },
  );

  safeLine(`ORDER_ID_SUFFIX ${idSuffix(pre.orderId)}`);
  safeLine(`POST_PAYMENT_INCIDENT_STATUS ${db.postPaymentIncidentStatus}`);
  safeLine(
    `REFUND_ALREADY_EXISTS ${db.refundAlreadyRecordedInApp || stripe?.refundAlreadyExists ? 'true' : 'false'}`,
  );
  if (db.amountUsdCents != null) {
    safeLine(`AMOUNT ${db.amountUsdCents}`);
    safeLine(`CURRENCY ${db.currency}`);
  } else {
    safeLine('AMOUNT unknown');
    safeLine(`CURRENCY ${db.currency}`);
  }
  safeLine(`STRIPE_PAYMENT_INTENT_ID_SUFFIX ${db.stripePaymentIntentIdSuffix}`);
  safeLine(
    `STRIPE_CHARGE_ID_SUFFIX ${stripe?.verified ? stripe.chargeIdSuffix : 'unknown'}`,
  );
  safeLine(
    `DASHBOARD_SEARCH_HINT ${buildDashboardSearchHint(db.stripePaymentIntentIdSuffix, idSuffix(pre.orderId))}`,
  );
  safeLine('DASHBOARD_MANUAL_REFUND deprecated_use_l11_refund_execute');

  for (const [k, v] of Object.entries(evaluation.checks)) {
    safeLine(`L11_REFUND_TARGET_CHECK_${k.toUpperCase()} ${v ? 'true' : 'false'}`);
  }

  if (evaluation.pass) {
    safeLine('L11_REFUND_TARGET_VERDICT READY_FOR_OPERATOR_APPROVAL');
    safeLine(
      `METADATA_WARNING ${stripe?.metadataWarning ? 'true' : 'false'}`,
    );
    safeLine(
      'NEXT_SAFE_COMMAND node tools/staging-auth-checkout-operator.mjs l11-stripe-diagnose',
    );
    safeLine(
      `L11_REFUND_APPROVAL_REQUIRED set_env_L11_REFUND_APPROVAL_exact_phrase`,
    );
    process.exitCode = 0;
    return;
  }

  safeLine('L11_REFUND_TARGET_VERDICT BLOCKED');
  safeLine(`BLOCKED_REASON ${evaluation.blockedReason ?? 'refund_target_failed'}`);
  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-refund-target')}`);
  process.exitCode = 1;
}

async function modeL11RefundExecute() {
  safeLine('MODE l11-refund-execute');
  safeLine('CANONICAL_MODE l11-refund-execute');
  safeLine('DO_NOT_REFUND false');

  const approval = String(process.env.L11_REFUND_APPROVAL ?? '');
  safeLine(`L11_REFUND_APPROVAL_PRESENT ${approval.length > 0 ? 'true' : 'false'}`);
  safeLine(
    `L11_REFUND_APPROVAL_EXACT ${refundApprovalPhraseMatches(approval) ? 'true' : 'false'}`,
  );

  const pre = await runL11PreflightCore({ verbose: false });
  if (!pre.pass) {
    safeLine('FINAL_REFUND_GUARD_PASS false');
    safeLine(`BLOCKED_REASON ${pre.blockedReason ?? 'preflight_failed'}`);
    safeLine('DO_NOT_REFUND true');
    process.exitCode = 1;
    return;
  }

  const targetRes = await fetchRefundTargetFromApi(pre.token, pre.orderId);
  const db = dbMappingFromRefundTargetApi(targetRes.json);
  const stripeMap = await resolveStripeMappingForOrder(pre.orderId, db);
  const targetEval = evaluateL11RefundTarget({
    preflightPass: true,
    orderId: pre.orderId,
    db,
    stripe: stripeMap.verified ? stripeMap : null,
  });

  const secret = readStripeSecretForL11();
  const executeEval = evaluateL11RefundExecuteGuards({
    targetPass: targetEval.pass,
    orderId: pre.orderId,
    approvalPhrase: approval,
    stripeKeyMode: stripeSecretKeyMode(secret),
    db,
    stripe: stripeMap.verified ? stripeMap : null,
  });

  for (const [k, v] of Object.entries(executeEval.checks)) {
    safeLine(`L11_REFUND_EXECUTE_CHECK_${k.toUpperCase()} ${v ? 'true' : 'false'}`);
  }

  if (!executeEval.pass) {
    safeLine('FINAL_REFUND_GUARD_PASS false');
    const blocked =
      executeEval.blockedReason ??
      stripeMap.blockedReason ??
      'refund_execute_guard_failed';
    safeLine(`BLOCKED_REASON ${blocked}`);
    safeLine('DO_NOT_REFUND true');
    const nextMode = executeEval.checks.stripe_verified
      ? 'l11-refund-target'
      : 'l11-stripe-diagnose';
    safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine(nextMode)}`);
    process.exitCode = 1;
    return;
  }

  safeLine('FINAL_REFUND_GUARD_PASS true');
  safeLine('REFUND_MODE full');
  safeLine('STRIPE_MODE test_only');

  const stripe = getStripeClient();
  if (!stripe) {
    safeLine('REFUND_CREATED false');
    safeLine('REFUND_ERROR_CODE stripe_test_key_missing');
    process.exitCode = 1;
    return;
  }
  const paymentIntentId = stripeMap.paymentIntentId;

  try {
    const result = await createFullPaymentIntentRefund(
      stripe,
      paymentIntentId,
      db.amountUsdCents,
    );
    safeLine('REFUND_CREATED true');
    safeLine(`REFUND_ID_SUFFIX ${result.refundIdSuffix}`);
    safeLine(`REFUND_STATUS ${result.status}`);
    safeLine('NEXT_SAFE_COMMAND node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify');
    process.exitCode = 0;
  } catch (err) {
    safeLine('REFUND_CREATED false');
    safeLine(`REFUND_ERROR_CODE ${String(err?.code ?? 'refund_failed')}`);
    safeLine('DO_NOT_REFUND true');
    process.exitCode = 1;
  }
}

async function modeL11PostRefundVerify() {
  safeLine('MODE l11-post-refund-verify');
  safeLine('DO_NOT_REFUND true');

  const orderId = await loadOrderId();
  if (!orderId) {
    safeLine('L11_REFUND_PROOF_VERDICT BLOCKED');
    safeLine('BLOCKED_REASON missing_order_id');
    process.exitCode = 1;
    return;
  }

  const tokenResult = await ensureOperatorToken({ verbose: true });
  if (!tokenResult.ok) {
    safeLine('L11_REFUND_PROOF_VERDICT BLOCKED');
    safeLine(`BLOCKED_REASON ${tokenResult.blockedReason ?? 'token_unavailable'}`);
    process.exitCode = 2;
    return;
  }

  const status = await runStatusCheckCore(tokenResult.token, { verbose: true });
  const truth = await runPhase1TruthCheckCore(tokenResult.token, { verbose: true });

  const evaluation = evaluateL11PostRefundVerify({ status, truth });
  for (const [k, v] of Object.entries(evaluation.checks)) {
    safeLine(`L11_POST_REFUND_CHECK_${k.toUpperCase()} ${v ? 'true' : 'false'}`);
  }

  if (evaluation.pass) {
    safeLine('L11_REFUND_PROOF_VERDICT PASS');
    safeLine('L11_STATUS PLAN_READY');
    process.exitCode = 0;
    return;
  }

  safeLine('L11_REFUND_PROOF_VERDICT BLOCKED');
  safeLine(`BLOCKED_REASON ${evaluation.blockedReason ?? 'not_refunded_yet'}`);
  safeLine(`NEXT_SAFE_COMMAND ${safeOperatorCommandLine('l11-post-refund-verify')}`);
  process.exitCode = 1;
}

async function modeL11Preflight() {
  safeLine('MODE l11-preflight');
  safeLine('DO_NOT_REFUND true');
  safeLine('L11_SCOPE preflight_only_no_refund_no_checkout_no_payment');
  safeLine(`L11_CANDIDATE_SUFFIX_HINT …04pvq0dr78`);

  const orderId = await loadOrderId();
  safeLine(`LOCAL_ORDER_ID_PRESENT ${orderId ? 'true' : 'false'}`);
  if (orderId) {
    safeLine(`LOCAL_ORDER_ID_PREVIEW ${redactIdPreview(orderId)}`);
  }
  if (!orderId) {
    printL11Blocked(
      'missing_order_id',
      safeOperatorCommandLine('l11-preflight'),
    );
    safeLine(
      'HINT set_order_id_first: cd .\\server; Set-Content .staging-order-id.local "cmp95a2kc0003jy04pvq0dr78"',
    );
    return;
  }

  const tokenResult = await ensureOperatorToken({ verbose: true });
  if (!tokenResult.ok) {
    const reason = tokenResult.blockedReason ?? 'token_unavailable';
    const next =
      reason === 'token_expired_credentials_missing'
        ? safeOperatorCommandLine('login')
        : safeOperatorCommandLine('login');
    printL11Blocked(reason, next);
    if (reason === 'token_expired_credentials_missing') {
      safeLine('HINT set STAGING_OPERATOR_EMAIL and STAGING_OPERATOR_PASSWORD then re-run l11-preflight');
      for (const line of windowsEnvSetupHintLines()) {
        safeLine(line);
      }
    }
    return;
  }

  safeLine(`LOGIN_HTTP ${tokenResult.loginHttp}`);

  safeLine('L11_STEP status-check');
  const status = await runStatusCheckCore(tokenResult.token, { verbose: true });
  safeLine(`STATUS_CHECK_HTTP ${status.http}`);
  if (status.orderFound) {
    safeLine('ORDER_FOUND true');
    safeLine(`ORDER_STATUS ${status.orderStatus}`);
    safeLine(`PAYMENT_STATUS ${status.paymentStatus}`);
    safeLine(`PAID_CONFIRMED ${status.paidConfirmed ? 'true' : 'false'}`);
    safeLine(
      `FULFILLMENT_ATTEMPT_COUNT ${status.fulfillmentAttemptCount}`,
    );
  } else {
    safeLine('ORDER_FOUND false');
  }

  safeLine('L11_STEP phase1-truth-check');
  const truth = await runPhase1TruthCheckCore(tokenResult.token, { verbose: true });
  safeLine(`PHASE1_TRUTH_HTTP ${truth.http}`);
  safeLine(`PHASE1_TRUTH_SLIM_PATH ${truth.usedSlimPath ? 'true' : 'false'}`);
  if (truth.orderFound) {
    safeLine(`POST_PAYMENT_INCIDENT_STATUS ${truth.postPaymentIncidentStatus}`);
    safeLine(
      `POST_PAYMENT_INCIDENT_MAP_SOURCE ${truth.postPaymentIncidentMapSource}`,
    );
  }
  safeLine(
    `PREFLIGHT_REFUND_ELIGIBLE ${truth.postPaymentIncidentStatus !== 'REFUNDED' ? 'true' : 'false'}`,
  );

  const evaluation = evaluateL11Preflight({
    tokenOk: true,
    loginHttp: tokenResult.loginHttp,
    status: {
      http: status.http,
      orderFound: status.orderFound,
      orderStatus: status.orderStatus,
      paymentStatus: status.paymentStatus,
      paidConfirmed: status.paidConfirmed,
      fulfillmentAttemptCount: status.fulfillmentAttemptCount,
      endpoint: status.endpoint,
    },
    phase1Truth: {
      http: truth.http,
      orderFound: truth.orderFound,
      postPaymentIncidentStatus: truth.postPaymentIncidentStatus,
      endpoint: truth.endpoint,
      usedSlimPath: truth.endpoint.startsWith(L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX),
    },
  });

  for (const [key, value] of Object.entries(evaluation.checks)) {
    safeLine(`L11_CHECK_${key.toUpperCase()} ${value ? 'true' : 'false'}`);
  }

  if (evaluation.pass) {
    safeLine('L11_PREFLIGHT_VERDICT PASS');
    safeLine('DO_NOT_REFUND true');
    safeLine('L11_STATUS PLAN_READY');
    safeLine('NEXT_STEP after_approval_only stripe_dashboard_full_refund_test_mode');
    process.exitCode = 0;
    return;
  }

  printL11Blocked(
    evaluation.blockedReason ?? 'preflight_failed',
    safeOperatorCommandLine('l11-preflight'),
  );
}

async function main() {
  l11StripeKeyBeforeDotenv = process.env.STRIPE_SECRET_KEY;
  loadOperatorDotenv(SERVER_ROOT);

  const parsed = parseOperatorCliArgv(process.argv);
  if (!parsed.ok) {
    failCliValidation(parsed);
    return;
  }

  const mode = parsed.mode;
  if (parsed.aliasFrom) {
    safeLine(`MODE_ALIAS_DETECTED ${parsed.aliasFrom}`);
    safeLine(`CANONICAL_MODE ${mode}`);
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
    case 'l11-preflight':
      await modeL11Preflight();
      break;
    case 'l11-refund-target':
      await modeL11RefundTarget();
      break;
    case 'l11-stripe-diagnose':
      await modeL11StripeDiagnose();
      break;
    case 'l11-db-stripe-mapping':
      await modeL11DbStripeMapping();
      break;
    case 'l11-key-diagnose':
      await modeL11KeyDiagnose();
      break;
    case 'l11-discover-refundable-order':
      await modeL11DiscoverRefundableOrder();
      break;
    case 'l11-mapping-diagnose':
      await modeL11MappingDiagnose();
      break;
    case 'l11-refresh-order-ref':
      await modeL11RefreshOrderRef();
      break;
    case 'l11-refund-execute':
      await modeL11RefundExecute();
      break;
    case 'l11-post-refund-verify':
      await modeL11PostRefundVerify();
      break;
    case 'staging-api-smoke':
      await modeStagingApiSmoke();
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
