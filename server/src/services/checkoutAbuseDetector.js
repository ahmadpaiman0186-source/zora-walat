/**
 * Conservative, in-memory checkout/session anti-abuse detector.
 *
 * Design goals:
 * - Must not mutate any persisted state.
 * - Prefer blocking only the highest-risk patterns that indicate retry-like
 *   abuse before fulfillment completes.
 * - Keep thresholds high enough to avoid breaking normal usage.
 */

const WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const FINGERPRINT_WINDOW_MS = 60 * 1000; // 1 minute

const FAST_GAP_MS = 2000; // "unusually fast" replays
const FAST_GAP_CONSECUTIVE_MIN = 2;

const MAX_ATTEMPTS_WINDOW_MED = 4;
const MAX_ATTEMPTS_WINDOW_HIGH = 7;

const MAX_IDEMP_ROTATION_MED = 2;
const MAX_IDEMP_ROTATION_HIGH = 3;

const tracks = new Map();

// Higher-level signals (user-only / IP-only) to catch abuse even when IP changes.
const MAX_USER_ATTEMPTS_WINDOW_MED = 6;
const MAX_USER_ATTEMPTS_WINDOW_HIGH = 10;
const MAX_IP_ATTEMPTS_WINDOW_MED = 6;
const MAX_IP_ATTEMPTS_WINDOW_HIGH = 10;

/**
 * @typedef {{ t: number, idem: string }} Event
 * @typedef {{ events: Event[] }} Track
 */

function nowMs(now) {
  return now instanceof Date ? now.getTime() : Date.now();
}

function pruneEvents(events, cutoffMs) {
  // events are appended; remove from the front.
  let i = 0;
  while (i < events.length && events[i].t < cutoffMs) i++;
  return events.slice(i);
}

function getTrack(key) {
  const existing = tracks.get(key);
  if (existing) return existing;
  const created = { events: [] };
  tracks.set(key, created);
  return created;
}

function computeDistinctIdemCount(events) {
  const set = new Set();
  for (const e of events) set.add(e.idem);
  return set.size;
}

function computeFastGapStreak(events) {
  // Count consecutive short gaps at the end.
  let streak = 0;
  for (let i = events.length - 1; i > 0; i--) {
    const gap = events[i].t - events[i - 1].t;
    if (gap <= FAST_GAP_MS) streak++;
    else break;
  }
  return streak;
}

/**
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.ip
 * @param {string} p.fingerprint
 * @param {string} p.idempotencyKey
 * @param {Date} p.now
 * @returns {{
 *   severity: 'low'|'medium'|'high',
 *   reasonCodes: string[],
 *   recommendedAction: string,
 *   riskLevel: 'low'|'medium'|'high'
 * }}
 */
export function classifyCheckoutAbuse({
  userId,
  ip,
  fingerprint,
  idempotencyKey,
  now,
}) {
  const t = nowMs(now);

  const userKey = `u:${userId}|ip:${ip}`;
  const userOnlyKey = `u:${userId}`;
  const ipOnlyKey = `ip:${ip}`;
  const fpKey = `u:${userId}|ip:${ip}|fp:${fingerprint}`;

  const userTrack = getTrack(userKey);
  const userOnlyTrack = getTrack(userOnlyKey);
  const ipOnlyTrack = getTrack(ipOnlyKey);
  const fpTrack = getTrack(fpKey);

  userTrack.events = pruneEvents(userTrack.events, t - WINDOW_MS);
  userOnlyTrack.events = pruneEvents(userOnlyTrack.events, t - WINDOW_MS);
  ipOnlyTrack.events = pruneEvents(ipOnlyTrack.events, t - WINDOW_MS);
  fpTrack.events = pruneEvents(fpTrack.events, t - FINGERPRINT_WINDOW_MS);

  userTrack.events.push({ t, idem: idempotencyKey });
  userOnlyTrack.events.push({ t, idem: idempotencyKey });
  ipOnlyTrack.events.push({ t, idem: idempotencyKey });
  fpTrack.events.push({ t, idem: idempotencyKey });

  const userEvents = userTrack.events;
  const userOnlyEvents = userOnlyTrack.events;
  const ipOnlyEvents = ipOnlyTrack.events;
  const fpEvents = fpTrack.events;

  const reasonCodes = [];
  let severity = 'low';

  // Excessive repeated attempts from same user/ip.
  if (userEvents.length >= MAX_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    reasonCodes.push('excessive_user_ip_attempts');
  } else if (userEvents.length >= MAX_ATTEMPTS_WINDOW_MED) {
    severity = 'medium';
    reasonCodes.push('excessive_user_ip_attempts');
  }

  // Excessive repeated attempts from same user (even across IP changes).
  if (userOnlyEvents.length >= MAX_USER_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    reasonCodes.push('excessive_user_attempts');
  } else if (userOnlyEvents.length >= MAX_USER_ATTEMPTS_WINDOW_MED) {
    if (severity !== 'high') severity = 'medium';
    reasonCodes.push('excessive_user_attempts');
  }

  // Excessive repeated attempts from same IP (even across users).
  if (ipOnlyEvents.length >= MAX_IP_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    reasonCodes.push('excessive_ip_attempts');
  } else if (ipOnlyEvents.length >= MAX_IP_ATTEMPTS_WINDOW_MED) {
    if (severity !== 'high') severity = 'medium';
    reasonCodes.push('excessive_ip_attempts');
  }

  // Unusually fast repeated order creation (same fingerprint).
  const fastStreak = computeFastGapStreak(fpEvents);
  if (fastStreak >= FAST_GAP_CONSECUTIVE_MIN) {
    severity = severity === 'high' ? 'high' : 'medium';
    reasonCodes.push('rapid_replay_timing');
  }

  // Suspicious retry-like behavior: idempotency key rotation on the same
  // fingerprint before fulfillment completes.
  const distinctIdem = computeDistinctIdemCount(fpEvents);
  if (distinctIdem >= MAX_IDEMP_ROTATION_HIGH) {
    severity = severity === 'high' ? 'high' : 'medium';
    reasonCodes.push('idempotency_key_rotation');
  } else if (
    distinctIdem >= MAX_IDEMP_ROTATION_MED &&
    fpEvents.length >= MAX_ATTEMPTS_WINDOW_MED
  ) {
    if (severity !== 'high') severity = 'medium';
    reasonCodes.push('idempotency_key_rotation');
  }

  // Extra hard threshold for fingerprint spam.
  if (fpEvents.length >= MAX_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    if (!reasonCodes.includes('fingerprint_spam')) {
      reasonCodes.push('fingerprint_spam');
    }
  } else if (fpEvents.length >= MAX_ATTEMPTS_WINDOW_MED && severity !== 'high') {
    if (!reasonCodes.includes('fingerprint_spam')) {
      reasonCodes.push('fingerprint_spam');
    }
  }

  // More explicit naming for the "same recipient/amount/operator in a short window"
  // concept: the fingerprint already includes (recipientNational, operatorKey, packageId, amount).
  // We keep `fingerprint_spam` as the underlying primitive, but expose a clearer code.
  if (reasonCodes.includes('fingerprint_spam')) {
    reasonCodes.push('recipient_amount_operator_replay');
  }

  const recommendedAction =
    severity === 'high'
      ? 'Throttle checkout creation; if payment is still pending, retry by reusing the same Idempotency-Key or wait.'
      : severity === 'medium'
        ? 'Multiple checkout attempts detected; ensure you are not spamming retries.'
        : 'No abuse indicators detected.';

  const primaryReasonCode = reasonCodes[0] ?? 'no_abuse_indicators';
  const detail = [
    `severity=${severity}`,
    `reasons=${reasonCodes.length ? reasonCodes.join(',') : 'none'}`,
    `userEvents=${userEvents.length}`,
    `userOnlyEvents=${userOnlyEvents.length}`,
    `ipOnlyEvents=${ipOnlyEvents.length}`,
    `fingerprintEvents=${fpEvents.length}`,
  ].join(' | ');

  return {
    severity,
    riskLevel: severity,
    reasonCode: primaryReasonCode,
    reasonCodes: Array.from(new Set(reasonCodes)),
    detail,
    recommendedAction,
  };
}

