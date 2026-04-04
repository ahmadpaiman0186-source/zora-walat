import crypto from 'node:crypto';

function normalizeHeaderValue(v) {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  const out = String(s).trim().toLowerCase();
  return out.slice(0, 200);
}

/**
 * Hash a conservative "device fingerprint" derived from request metadata.
 *
 * Safety:
 * - No raw browser fingerprint fields are persisted or logged.
 * - Only a SHA-256 hash is returned for anti-abuse bucketing.
 * - Uses only non-sensitive headers; does not use cookies or tokens.
 *
 * @param {import('express').Request} req
 * @returns {string} hex SHA-256 hash
 */
export function deviceFingerprintHash(req) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const ua = normalizeHeaderValue(req.headers['user-agent']);
  const al = normalizeHeaderValue(req.headers['accept-language']);
  const secUa = normalizeHeaderValue(req.headers['sec-ch-ua']);
  const platform = normalizeHeaderValue(
    req.headers['sec-ch-ua-platform'],
  );
  const mobile = normalizeHeaderValue(req.headers['sec-ch-ua-mobile']);

  // Include env so hashes aren't reused across development vs production.
  const raw = `zora-walat-device-v1|env=${nodeEnv}|ua=${ua}|al=${al}|sec=${secUa}|platform=${platform}|mobile=${mobile}`;

  return crypto.createHash('sha256').update(raw).digest('hex');
}

