import { config, reloadlyApiBase, reloadlyAudience } from '../config.js';

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  const res = await fetch('https://auth.reloadly.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.reloadlyClientId,
      client_secret: config.reloadlyClientSecret,
      grant_type: 'client_credentials',
      audience: reloadlyAudience(),
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Reloadly auth failed ${res.status}: ${body}`);
  }

  const json = JSON.parse(body);
  cachedToken = json.access_token;
  tokenExpiresAt = now + (json.expires_in || 3600) * 1000;
  return cachedToken;
}

/**
 * Send airtime top-up. Amount is in USD when useLocalAmount is false (Reloadly international send).
 * @returns {Promise<{ transactionId: string, operatorReference?: string, raw: object }>}
 */
export async function sendTopup({
  operatorId,
  amountUsd,
  nationalNumber,
  customIdentifier,
}) {
  const token = await getAccessToken();
  const base = reloadlyApiBase();

  const payload = {
    operatorId: Number(operatorId),
    amount: Number(amountUsd),
    useLocalAmount: false,
    customIdentifier: String(customIdentifier).slice(0, 128),
    recipientPhone: {
      countryCode: 'AF',
      number: nationalNumber.replace(/^0/, ''),
    },
  };

  const res = await fetch(`${base}/topups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/com.reloadly.topups-v1+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(json.message || json.error || text || 'Reloadly topup failed');
    err.status = res.status;
    err.reloadlyBody = json;
    throw err;
  }

  return {
    transactionId: String(json.transactionId ?? json.id ?? ''),
    operatorReference: json.operatorTransactionId ?? json.pinDetail?.pin,
    raw: json,
  };
}

export function reloadlyOperatorId(operatorKey) {
  const raw = config.operators[operatorKey];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
