/**
 * In-process abuse signals for web top-up (order create, mark-paid, PaymentIntent).
 * Pair with Redis-backed rate limits ({@link webtopTopupsPerMinuteLimiter}) for multi-instance parity.
 *
 * Blocks emit {@link WEBTOPUP_CLIENT_ERROR_CODE.WEBTOPUP_ABUSE_BLOCKED} with `details.abuseReason`.
 */

import { env } from '../config/env.js';
import { WEBTOPUP_CLIENT_ERROR_CODE } from '../constants/webtopupClientErrors.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { getWebtopAbuseUserFacing } from '../lib/webtopUserFacingStatus.js';
import { normalizeTopupPhone } from '../lib/topupOrderPayload.js';
import { webTopupLog } from '../lib/webTopupObservability.js';
import { clientIpKey } from './rateLimits.js';

function allowWebtopTestEnvOverrides() {
  return (
    process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test'
  );
}

/**
 * Non-test: frozen config only. Test suite may override select thresholds via `process.env` between cases.
 * @param {string} key
 * @param {number} frozen
 */
function abuseIntTestOverride(key, frozen) {
  if (!allowWebtopTestEnvOverrides()) return frozen;
  const raw = process.env[key];
  if (raw === undefined || raw === '') return frozen;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(100_000, n) : frozen;
}

function abuseBurstWindowMs() {
  return env.webtopupAbuseBurstWindowMs;
}
function abuseBurstMax() {
  return abuseIntTestOverride('WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW', env.webtopupAbuseBurstMaxPerWindow);
}
function abusePiWindowMs() {
  return env.webtopupAbusePiChurnWindowMs;
}
function abusePiMax() {
  return abuseIntTestOverride(
    'WEBTOPUP_ABUSE_PI_CHURN_MAX_PER_WINDOW',
    env.webtopupAbusePiChurnMaxPerWindow,
  );
}
function abuseMultiWindowMs() {
  return env.webtopupAbuseMultiTargetWindowMs;
}
function abuseMultiDistinctMax() {
  return abuseIntTestOverride(
    'WEBTOPUP_ABUSE_MULTI_TARGET_DISTINCT_MAX',
    env.webtopupAbuseMultiTargetDistinctMax,
  );
}
function abuseSpamWindowMs() {
  return env.webtopupAbusePhoneSpamWindowMs;
}
function abuseSpamMax() {
  return env.webtopupAbusePhoneSpamMaxPerWindow;
}
function abuseFailWindowMs() {
  return env.webtopupAbuseFailedPaymentWindowMs;
}
function abuseFailMax() {
  return env.webtopupAbuseFailedPaymentMaxBeforeBlock;
}

/** @type {Record<string, number>} */
const abuseBlockCounts = {};

/** @type {Map<string, number[]>} */
const burstByIp = new Map();
/** @type {Map<string, number[]>} */
const piChurnByIp = new Map();
/** @type {Map<string, { t: number; key: string }[]>} */
const multiTargetByIp = new Map();
/** @type {Map<string, number[]>} */
const phoneSpamByIpPhoneDest = new Map();
/** @type {Map<string, number[]>} */
const failedPaymentByIp = new Map();

function prune(ts, windowMs) {
  const cutoff = Date.now() - windowMs;
  return ts.filter((t) => t > cutoff);
}

function pruneEntries(entries, windowMs) {
  const cutoff = Date.now() - windowMs;
  return entries.filter((e) => e.t > cutoff);
}

function bumpAbuseBlock(reason) {
  abuseBlockCounts[reason] = (abuseBlockCounts[reason] ?? 0) + 1;
}

/**
 * Operator snapshot (in-process; single-node). Resets on restart.
 */
export function getWebtopAbuseProtectionSnapshot() {
  return {
    collectedAt: new Date().toISOString(),
    blockCounts: { ...abuseBlockCounts },
    thresholds: {
      burst: {
        windowMs: abuseBurstWindowMs(),
        maxPerWindow: abuseBurstMax(),
      },
      paymentIntentChurn: {
        windowMs: abusePiWindowMs(),
        maxPerWindow: abusePiMax(),
      },
      multiTargetSpray: {
        windowMs: abuseMultiWindowMs(),
        maxDistinctDestinations: abuseMultiDistinctMax(),
      },
      sameTargetSpam: {
        windowMs: abuseSpamWindowMs(),
        maxPerWindow: abuseSpamMax(),
      },
      failedPaymentPattern: {
        windowMs: abuseFailWindowMs(),
        maxBeforeBlock: abuseFailMax(),
      },
    },
  };
}

/**
 * Reset in-memory abuse maps (unit tests only).
 */
export function __resetWebtopAbuseStoresForTests() {
  burstByIp.clear();
  piChurnByIp.clear();
  multiTargetByIp.clear();
  phoneSpamByIpPhoneDest.clear();
  failedPaymentByIp.clear();
  for (const k of Object.keys(abuseBlockCounts)) delete abuseBlockCounts[k];
}

/**
 * @param {import('express').Request} req
 * @param {string} abuseReason
 * @param {Record<string, unknown>} [fields]
 */
function emitAbuseBlocked(req, abuseReason, fields = {}) {
  webTopupLog(req.log, 'warn', 'abuse_blocked', {
    abuseReason,
    path: req.path,
    traceId: req.traceId ?? undefined,
    ...fields,
  });
  bumpAbuseBlock(abuseReason);
}

/**
 * @param {import('express').Response} res
 * @param {import('express').Request} req
 * @param {string} abuseReason
 * @param {string} message
 * @param {Record<string, unknown>} [logFields]
 */
function respondAbuseBlocked(res, req, abuseReason, message, logFields = {}) {
  emitAbuseBlocked(req, abuseReason, {
    clientIp: safeClientIp(req),
    ...logFields,
  });
  const ux = getWebtopAbuseUserFacing(abuseReason, message);
  return res.status(429).json(
    clientErrorBody(message, WEBTOPUP_CLIENT_ERROR_CODE.WEBTOPUP_ABUSE_BLOCKED, {
      abuseReason,
      moneyPathOutcome: 'rejected',
      userStatus: ux.userStatus,
      userMessage: ux.userMessage,
      nextAction: 'wait',
      isFinal: false,
      isRetryable: true,
    }),
  );
}

function safeClientIp(req) {
  const raw = req.ip || req.socket?.remoteAddress || '';
  return typeof raw === 'string' ? raw.replace(/^::ffff:/, '').slice(0, 64) : '';
}

function safePhoneSuffix(phone) {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 4 ? d.slice(-4) : undefined;
}

function isPaymentPathFailureStatus(code) {
  if (code === 429) return false;
  if (code < 401 || code > 499) return false;
  if (code === 400) return false;
  return true;
}

function isWebtopMarkPaid(req) {
  return req.method === 'POST' && typeof req.path === 'string' && /\/mark-paid$/.test(req.path);
}

function isWebtopCreatePaymentIntent(req) {
  return req.method === 'POST' && req.path === '/create-payment-intent';
}

/** Mounted at `/api/topup-orders` → `req.path` is `/`; bare route tests may use `/api/topup-orders`. */
function isWebtopOrderCreatePost(req) {
  if (req.method !== 'POST') return false;
  if (req.path === '/') return true;
  const p = String(req.path ?? '');
  return p === '/api/topup-orders' || /\/topup-orders\/?$/.test(p);
}

function isWebtopBurstActivity(req) {
  return isWebtopOrderCreatePost(req) || isWebtopCreatePaymentIntent(req);
}

/**
 * Records non-validation 4xx on mark-paid + PaymentIntent for later {@link webtopAbusePreCheck}.
 */
export function webtopAbuseRecordFailedPayments(req, res, next) {
  if (!isWebtopMarkPaid(req) && !isWebtopCreatePaymentIntent(req)) {
    return next();
  }
  const ip = clientIpKey(req);
  const key = `fp:${ip}`;
  res.on('finish', () => {
    const code = res.statusCode;
    if (!isPaymentPathFailureStatus(code)) return;
    const windowMs = abuseFailWindowMs();
    const max = abuseFailMax();
    const arr = prune(failedPaymentByIp.get(key) ?? [], windowMs);
    arr.push(Date.now());
    failedPaymentByIp.set(key, arr);
    if (arr.length === max - 1) {
      webTopupLog(req.log, 'warn', 'abuse_signal_detected', {
        abuseReason: 'abuse_failed_payment_pattern',
        signal: 'warn_threshold',
        failCount: arr.length,
        windowMs,
        path: req.path,
        traceId: req.traceId ?? undefined,
        clientIp: safeClientIp(req),
      });
    }
  });
  next();
}

/**
 * Blocks hot IPs with repeated payment-path failures; advanced behavior checks on money paths.
 */
export function webtopAbusePreCheck(req, res, next) {
  const ip = clientIpKey(req);
  const fpKey = `fp:${ip}`;

  const failWindow = abuseFailWindowMs();
  const failMax = abuseFailMax();
  const fails = prune(failedPaymentByIp.get(fpKey) ?? [], failWindow);
  failedPaymentByIp.set(fpKey, fails);
  if (fails.length >= failMax) {
    return respondAbuseBlocked(
      res,
      req,
      'abuse_failed_payment_pattern',
      'Too many failed payment attempts; try again later.',
    );
  }

  if (isWebtopBurstActivity(req)) {
    const burstWindow = abuseBurstWindowMs();
    const burstMax = abuseBurstMax();
    const bArr = prune(burstByIp.get(ip) ?? [], burstWindow);
    if (bArr.length >= burstMax) {
      return respondAbuseBlocked(
        res,
        req,
        'abuse_burst_activity',
        'Too many top-up requests in a short time; try again later.',
      );
    }
    bArr.push(Date.now());
    burstByIp.set(ip, bArr);
  }

  if (isWebtopCreatePaymentIntent(req)) {
    const piWindow = abusePiWindowMs();
    const piMax = abusePiMax();
    const piArr = prune(piChurnByIp.get(ip) ?? [], piWindow);
    if (piArr.length >= piMax) {
      return respondAbuseBlocked(
        res,
        req,
        'abuse_payment_intent_churn',
        'Too many payment attempts; try again later.',
      );
    }
    piArr.push(Date.now());
    piChurnByIp.set(ip, piArr);
  }

  if (isWebtopOrderCreatePost(req)) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const phoneRaw = body.phoneNumber;
    const dest = String(body.destinationCountry ?? '')
      .trim()
      .toLowerCase();
    const opKey = String(body.operatorKey ?? '')
      .trim()
      .slice(0, 32);

    if (typeof phoneRaw === 'string' && dest.length >= 2) {
      const phone = normalizeTopupPhone(phoneRaw);
      if (phone.length >= 9) {
        const targetKey = `${dest}:${phone}`;
        const mtWindow = abuseMultiWindowMs();
        const mtMax = abuseMultiDistinctMax();
        let entries = pruneEntries(multiTargetByIp.get(ip) ?? [], mtWindow);
        const distinct = new Set(entries.map((e) => e.key));
        if (distinct.size >= mtMax && !distinct.has(targetKey)) {
          return respondAbuseBlocked(
            res,
            req,
            'abuse_multi_target_spray',
            'Too many different numbers for this session; try again later.',
            {
              destinationCountry: dest,
              operatorKey: opKey || undefined,
              phoneSuffix: safePhoneSuffix(phone),
            },
          );
        }
        entries.push({ t: Date.now(), key: targetKey });
        multiTargetByIp.set(ip, entries);

        const spamWindow = abuseSpamWindowMs();
        const spamMax = abuseSpamMax();
        const pk = `spam:${ip}:${dest}:${phone}`;
        const arr = prune(phoneSpamByIpPhoneDest.get(pk) ?? [], spamWindow);
        if (arr.length >= spamMax) {
          return respondAbuseBlocked(
            res,
            req,
            'abuse_same_target_spam',
            'Too many top-up attempts for this number; try again later.',
            {
              destinationCountry: dest,
              operatorKey: opKey || undefined,
              phoneSuffix: safePhoneSuffix(phone),
            },
          );
        }
        arr.push(Date.now());
        phoneSpamByIpPhoneDest.set(pk, arr);
      }
    }
  }

  next();
}
