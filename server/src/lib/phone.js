import crypto from 'node:crypto';

export function digitsOnly(input) {
  return String(input || '').replace(/\D/g, '');
}

export function normalizeAfghanNational(input) {
  let d = digitsOnly(input);
  if (!d) return null;
  if (d.startsWith('937') && d.length >= 11) return d.slice(3);
  if (d.startsWith('93') && d.length >= 10) {
    const rest = d.slice(2);
    if (rest.startsWith('7')) return rest;
  }
  if (d.startsWith('00937')) {
    d = d.slice(5);
    if (d.startsWith('7')) return d;
  }
  if (d.startsWith('0') && d.length >= 10) return d.slice(1);
  if (d.startsWith('7')) return d;
  return d;
}

export function validateAfghanMobileNational(n) {
  if (!n || n.length < 9 || n.length > 10) {
    return { ok: false, error: 'Invalid length' };
  }
  if (!n.startsWith('7')) return { ok: false, error: 'Must start with 7' };
  if (!/^7\d{8,9}$/.test(n)) return { ok: false, error: 'Invalid format' };
  return { ok: true };
}

/**
 * Afghan mobile national digits (e.g. 7XXXXXXXX) → E.164 (+937…).
 * Returns null if input is not a valid Afghan mobile national form.
 */
export function afghanNationalToE164(national) {
  const v = validateAfghanMobileNational(national);
  if (!v.ok) return null;
  return `+93${national}`;
}

export function phoneHash(national) {
  return crypto.createHash('sha256').update(national).digest('hex');
}
