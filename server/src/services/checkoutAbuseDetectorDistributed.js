import { withRedis } from './redisClient.js';
import {
  classifyCheckoutAbuse as classifyInMemory,
} from './checkoutAbuseDetector.js';

const WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const FINGERPRINT_WINDOW_MS = 60 * 1000; // 1 minute

const FAST_GAP_MS = 2000; // unusually fast replays
const FAST_GAP_CONSECUTIVE_MIN = 2;

const MAX_ATTEMPTS_WINDOW_MED = 4;
const MAX_ATTEMPTS_WINDOW_HIGH = 7;

const MAX_IDEMP_ROTATION_MED = 2;
const MAX_IDEMP_ROTATION_HIGH = 3;

const MAX_USER_ATTEMPTS_WINDOW_MED = 6;
const MAX_USER_ATTEMPTS_WINDOW_HIGH = 10;
const MAX_IP_ATTEMPTS_WINDOW_MED = 6;
const MAX_IP_ATTEMPTS_WINDOW_HIGH = 10;

const REDIS_PREFIX = 'zora_walat:abuse:checkout:v1';

function nowMs(now) {
  return now instanceof Date ? now.getTime() : Date.now();
}

function normIpPart(ip) {
  return String(ip ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 80);
}

function extractIdempotencyKeyFromMember(member) {
  // member = "<idempotencyKey>:<timestampMs>"
  const idx = String(member).lastIndexOf(':');
  if (idx === -1) return String(member);
  return String(member).slice(0, idx);
}

function computeFastGapStreak(timestampsAsc) {
  let streak = 0;
  for (let i = timestampsAsc.length - 1; i > 0; i--) {
    const gap = timestampsAsc[i] - timestampsAsc[i - 1];
    if (gap <= FAST_GAP_MS) streak++;
    else break;
  }
  return streak;
}

function uniqueCount(values) {
  return new Set(values).size;
}

function computeClassificationFromMetrics(metrics) {
  const {
    userIpCount,
    userIpDeviceCount,
    userOnlyCount,
    ipOnlyCount,
    fpCount,
    fpDeviceCount,
    fpFastStreak,
    fpFastStreakDevice,
    fpDistinctIdem,
    fpDistinctIdemDevice,
  } = metrics;

  const lenIpMax = Math.max(userIpCount, userIpDeviceCount);
  const fpLenMax = Math.max(fpCount, fpDeviceCount);
  const fastStreakMax = Math.max(fpFastStreak, fpFastStreakDevice);
  const distinctIdemMax = Math.max(fpDistinctIdem, fpDistinctIdemDevice);

  const reasonCodes = [];
  let severity = 'low';

  if (lenIpMax >= MAX_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    reasonCodes.push('excessive_user_ip_attempts');
  } else if (lenIpMax >= MAX_ATTEMPTS_WINDOW_MED) {
    severity = 'medium';
    reasonCodes.push('excessive_user_ip_attempts');
  }

  // user-only
  if (userOnlyCount >= MAX_USER_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    reasonCodes.push('excessive_user_attempts');
  } else if (userOnlyCount >= MAX_USER_ATTEMPTS_WINDOW_MED) {
    if (severity !== 'high') severity = 'medium';
    reasonCodes.push('excessive_user_attempts');
  }

  // ip-only
  if (ipOnlyCount >= MAX_IP_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    reasonCodes.push('excessive_ip_attempts');
  } else if (ipOnlyCount >= MAX_IP_ATTEMPTS_WINDOW_MED) {
    if (severity !== 'high') severity = 'medium';
    reasonCodes.push('excessive_ip_attempts');
  }

  if (fastStreakMax >= FAST_GAP_CONSECUTIVE_MIN) {
    severity = severity === 'high' ? 'high' : 'medium';
    reasonCodes.push('rapid_replay_timing');
  }

  // Idempotency key rotation on the same fingerprint
  if (distinctIdemMax >= MAX_IDEMP_ROTATION_HIGH) {
    severity = severity === 'high' ? 'high' : 'medium';
    reasonCodes.push('idempotency_key_rotation');
  } else if (
    distinctIdemMax >= MAX_IDEMP_ROTATION_MED &&
    fpLenMax >= MAX_ATTEMPTS_WINDOW_MED
  ) {
    if (severity !== 'high') severity = 'medium';
    reasonCodes.push('idempotency_key_rotation');
  }

  if (fpLenMax >= MAX_ATTEMPTS_WINDOW_HIGH) {
    severity = 'high';
    if (!reasonCodes.includes('fingerprint_spam')) {
      reasonCodes.push('fingerprint_spam');
    }
  } else if (fpLenMax >= MAX_ATTEMPTS_WINDOW_MED && severity !== 'high') {
    if (!reasonCodes.includes('fingerprint_spam')) {
      reasonCodes.push('fingerprint_spam');
    }
  }

  if (reasonCodes.includes('fingerprint_spam')) {
    reasonCodes.push('recipient_amount_operator_replay');
  }

  const recommendedAction =
    severity === 'high'
      ? 'Throttle checkout creation; if payment is still pending, retry by reusing the same Idempotency-Key or wait.'
      : severity === 'medium'
        ? 'Multiple checkout attempts detected; ensure you are not spamming retries.'
        : 'No abuse indicators detected.';

  const uniqueCodes = Array.from(new Set(reasonCodes));
  const primaryReasonCode = uniqueCodes[0] ?? 'no_abuse_indicators';

  const detail = [
    `severity=${severity}`,
    `reasonCodes=${uniqueCodes.join(',') || 'none'}`,
    `userIpCount=${userIpCount}`,
    `userIpDeviceCount=${userIpDeviceCount}`,
    `userOnlyCount=${userOnlyCount}`,
    `ipOnlyCount=${ipOnlyCount}`,
    `fpCount=${fpCount}`,
    `fpDeviceCount=${fpDeviceCount}`,
    `fpFastStreak=${fpFastStreak}`,
    `fpFastStreakDevice=${fpFastStreakDevice}`,
    `fpDistinctIdem=${fpDistinctIdem}`,
    `fpDistinctIdemDevice=${fpDistinctIdemDevice}`,
  ].join(' | ');

  return {
    severity,
    riskLevel: severity,
    reasonCode: primaryReasonCode,
    reasonCodes: uniqueCodes,
    detail,
    recommendedAction,
  };
}

async function classifyCheckoutAbuseRedis({
  userId,
  ip,
  fingerprint,
  deviceFingerprintHash,
  idempotencyKey,
  now,
}) {
  const t = nowMs(now);
  const max = t;
  const userMin = t - WINDOW_MS;
  const fpMin = t - FINGERPRINT_WINDOW_MS;

  const ipPart = normIpPart(ip);
  const devicePart = String(deviceFingerprintHash ?? 'none').slice(0, 64);

  const userIpKey = `${REDIS_PREFIX}:userip:${userId}:${ipPart}`;
  const userIpDeviceKey = `${REDIS_PREFIX}:useripd:${userId}:${ipPart}:${devicePart}`;
  const userOnlyKey = `${REDIS_PREFIX}:user:${userId}`;
  const ipOnlyKey = `${REDIS_PREFIX}:ip:${ipPart}`;
  const fpKey = `${REDIS_PREFIX}:fp:${userId}:${ipPart}:${fingerprint}`;
  const fpDeviceKey = `${REDIS_PREFIX}:fpd:${userId}:${ipPart}:${devicePart}:${fingerprint}`;

  const member = `${idempotencyKey}:${t}`;
  const userTtlSeconds = Math.ceil(WINDOW_MS / 1000) + 5;
  const fpTtlSeconds = Math.ceil(FINGERPRINT_WINDOW_MS / 1000) + 5;

  return withRedis(async (client) => {
    // Record current request (include it in window metrics).
    await client.sendCommand(['ZADD', userIpKey, String(t), member]);
    await client.sendCommand(['EXPIRE', userIpKey, String(userTtlSeconds)]);

    await client.sendCommand(['ZADD', userIpDeviceKey, String(t), member]);
    await client.sendCommand([
      'EXPIRE',
      userIpDeviceKey,
      String(userTtlSeconds),
    ]);

    await client.sendCommand(['ZADD', userOnlyKey, String(t), member]);
    await client.sendCommand(['EXPIRE', userOnlyKey, String(userTtlSeconds)]);

    await client.sendCommand(['ZADD', ipOnlyKey, String(t), member]);
    await client.sendCommand(['EXPIRE', ipOnlyKey, String(userTtlSeconds)]);

    await client.sendCommand(['ZADD', fpKey, String(t), member]);
    await client.sendCommand(['EXPIRE', fpKey, String(fpTtlSeconds)]);

    await client.sendCommand(['ZADD', fpDeviceKey, String(t), member]);
    await client.sendCommand(['EXPIRE', fpDeviceKey, String(fpTtlSeconds)]);

    const [
      userIpCount,
      userIpDeviceCount,
      userOnlyCount,
      ipOnlyCount,
      fpCount,
      fpDeviceCount,
    ] = await Promise.all([
      client.sendCommand([
        'ZCOUNT',
        userIpKey,
        String(userMin),
        String(max),
      ]),
      client.sendCommand([
        'ZCOUNT',
        userIpDeviceKey,
        String(userMin),
        String(max),
      ]),
      client.sendCommand([
        'ZCOUNT',
        userOnlyKey,
        String(userMin),
        String(max),
      ]),
      client.sendCommand(['ZCOUNT', ipOnlyKey, String(userMin), String(max)]),
      client.sendCommand(['ZCOUNT', fpKey, String(fpMin), String(max)]),
      client.sendCommand([
        'ZCOUNT',
        fpDeviceKey,
        String(fpMin),
        String(max),
      ]),
    ]);

    const maxEvents = MAX_ATTEMPTS_WINDOW_HIGH;

    const lastFpBase = await client.sendCommand([
      'ZREVRANGEBYSCORE',
      fpKey,
      String(max),
      String(fpMin),
      'LIMIT',
      '0',
      String(maxEvents),
      'WITHSCORES',
    ]);

    const lastFpDev = await client.sendCommand([
      'ZREVRANGEBYSCORE',
      fpDeviceKey,
      String(max),
      String(fpMin),
      'LIMIT',
      '0',
      String(maxEvents),
      'WITHSCORES',
    ]);

    function parseMembersWithScores(arr) {
      // [member1, score1, member2, score2, ...] in descending order
      /** @type {{ member: string, score: number }[]} */
      const out = [];
      for (let i = 0; i < arr.length; i += 2) {
        const memberStr = arr[i];
        const scoreStr = arr[i + 1];
        const scoreNum = parseFloat(String(scoreStr));
        out.push({ member: String(memberStr), score: scoreNum });
      }
      // convert to chronological (ascending timestamps)
      out.reverse();
      return out;
    }

    const fpBaseEvents = parseMembersWithScores(lastFpBase ?? []);
    const fpDevEvents = parseMembersWithScores(lastFpDev ?? []);

    const fpFastStreak = computeFastGapStreak(
      fpBaseEvents.map((e) => e.score),
    );
    const fpFastStreakDevice = computeFastGapStreak(
      fpDevEvents.map((e) => e.score),
    );

    const fpDistinctIdem = uniqueCount(
      fpBaseEvents.map((e) => extractIdempotencyKeyFromMember(e.member)),
    );
    const fpDistinctIdemDevice = uniqueCount(
      fpDevEvents.map((e) => extractIdempotencyKeyFromMember(e.member)),
    );

    return computeClassificationFromMetrics({
      userIpCount: Number(userIpCount) || 0,
      userIpDeviceCount: Number(userIpDeviceCount) || 0,
      userOnlyCount: Number(userOnlyCount) || 0,
      ipOnlyCount: Number(ipOnlyCount) || 0,
      fpCount: Number(fpCount) || 0,
      fpDeviceCount: Number(fpDeviceCount) || 0,
      fpFastStreak,
      fpFastStreakDevice,
      fpDistinctIdem,
      fpDistinctIdemDevice,
    });
  }).then((r) => {
    if (!r.ok) throw new Error(r.error);
    return r.value;
  });
}

let lastRedisLogAt = 0;

/**
 * Distributed checkout anti-abuse classification.
 * Primary: Redis (distributed). Fallback: in-memory (safe).
 */
export async function classifyCheckoutAbuseDistributed(params) {
  try {
    // If Redis is configured, attempt Redis-based classification.
    const abuse = await classifyCheckoutAbuseRedis(params);
    return abuse;
  } catch (err) {
    const now = Date.now();
    if (now - lastRedisLogAt > 10_000) {
      lastRedisLogAt = now;
      // Do not log secrets; include only high-level signals.
      console.warn(
        'checkout anti-abuse: redis unavailable; falling back to in-memory',
        { reason: 'redis_unavailable' },
      );
    }
    // Fallback to existing in-memory classification (device hash is ignored).
    return classifyInMemory(params);
  }
}

