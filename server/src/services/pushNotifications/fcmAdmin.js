import admin from 'firebase-admin';

import { env } from '../../config/env.js';

let _initialized = false;

function parseServiceAccount() {
  const raw = env.firebaseServiceAccountJson;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[fcm] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    return null;
  }
}

export function getFirebaseMessageClient() {
  if (!env.pushNotificationsEnabled) {
    return null;
  }
  const credJson = parseServiceAccount();
  if (!credJson || typeof credJson !== 'object') {
    return null;
  }
  if (!_initialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(
          /** @type {import('firebase-admin').ServiceAccount} */ (credJson),
        ),
      });
      _initialized = true;
    } catch (e) {
      console.warn('[fcm] initializeApp failed', e?.message ?? e);
      return null;
    }
  }
  return admin.messaging();
}

/**
 * @param {object} opts
 * @param {string[]} opts.tokens
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {Record<string, string>} opts.data  FCM data map (string values only)
 * @param {'high' | 'normal'} [opts.androidPriority]
 */
export async function sendMulticastDataNotification(opts) {
  const messaging = getFirebaseMessageClient();
  if (!messaging) {
    return { skipped: true };
  }
  const { tokens, title, body, data, androidPriority = 'normal' } = opts;
  const cleanTokens = [...new Set(tokens.map((t) => String(t).trim()).filter(Boolean))];
  if (cleanTokens.length === 0) {
    return { skipped: true };
  }

  /** @type {import('firebase-admin').messaging.MulticastMessage} */
  const message = {
    tokens: cleanTokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data ?? {}).map(([k, v]) => [k, String(v ?? '')]),
    ),
    android: {
      priority: androidPriority === 'high' ? 'high' : 'normal',
    },
    apns: {
      headers:
        androidPriority === 'high'
          ? { 'apns-priority': '10' }
          : { 'apns-priority': '5' },
      payload: {
        aps: {
          alert: { title, body },
          sound: 'default',
        },
      },
    },
  };

  try {
    const res = await messaging.sendEachForMulticast(message);
    return {
      successCount: res.successCount,
      failureCount: res.failureCount,
      responses: res.responses,
    };
  } catch (e) {
    console.warn('[fcm] sendEachForMulticast failed', e?.message ?? e);
    return { error: String(e?.message ?? e) };
  }
}
