import { createHash } from 'node:crypto';

/**
 * One-way hash for analytics / risk (destination ISO + digits-only national). Not reversible to full E.164.
 * @param {string} destinationCountry
 * @param {string} phoneNational
 */
export function computePhoneAnalyticsHash(destinationCountry, phoneNational) {
  const cc = String(destinationCountry ?? '').trim().toUpperCase();
  const n = String(phoneNational ?? '').replace(/\D/g, '');
  return createHash('sha256').update(`${cc}:${n}`, 'utf8').digest('hex');
}
