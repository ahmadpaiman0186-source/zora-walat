const STORAGE_KEY = 'zw_checkout_session_key';

export function getOrCreateCheckoutSessionKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    let k = window.localStorage.getItem(STORAGE_KEY);
    if (!k || k.length < 10) {
      k = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, k);
    }
    return k;
  } catch {
    return crypto.randomUUID();
  }
}

export function saveCheckoutSessionKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

const TOPUP_UPDATE_TOKEN_PREFIX = 'zw_topup_ut:';

/** Persists plain update token so idempotent order replays (no token in body) can still call mark-paid. */
export function saveTopupUpdateToken(orderId: string, token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${TOPUP_UPDATE_TOKEN_PREFIX}${orderId}`, token);
  } catch {
    /* ignore */
  }
}

export function getTopupUpdateToken(orderId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(`${TOPUP_UPDATE_TOKEN_PREFIX}${orderId}`);
  } catch {
    return null;
  }
}

export function clearTopupUpdateToken(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(`${TOPUP_UPDATE_TOKEN_PREFIX}${orderId}`);
  } catch {
    /* ignore */
  }
}
