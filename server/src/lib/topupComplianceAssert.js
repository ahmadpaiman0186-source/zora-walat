import { HttpError } from './httpError.js';
import {
  digitsIndicateBlockedComplianceDialPrefix,
  isRestrictedRegionCode,
} from '../policy/restrictedRegions.js';

/**
 * Defense-in-depth: block sanctioned/compliance destinations and barred dial prefixes on web top-up
 * before persistence or Stripe — complements `blockRestrictedCountries` middleware.
 *
 * @param {{ originCountry?: string, destinationCountry?: string, phoneNumber?: string }} input
 */
export function assertWebTopupMoneyPathComplianceOrThrow(input) {
  const oc = String(input.originCountry ?? '').trim().toUpperCase();
  const dc = String(input.destinationCountry ?? '').trim().toUpperCase();
  if (isRestrictedRegionCode(oc) || isRestrictedRegionCode(dc)) {
    throw new HttpError(403, 'Service not available in this region', {
      code: 'restricted_region',
    });
  }
  const phone = String(input.phoneNumber ?? '').replace(/\D/g, '');
  if (digitsIndicateBlockedComplianceDialPrefix(phone)) {
    throw new HttpError(403, 'Service not available in this region', {
      code: 'restricted_region',
    });
  }
}

/**
 * @param {{ originCountry: string, destinationCountry: string, phoneNumber: string }} row
 */
export function assertWebTopupStoredOrderComplianceOrThrow(row) {
  assertWebTopupMoneyPathComplianceOrThrow({
    originCountry: row.originCountry,
    destinationCountry: row.destinationCountry,
    phoneNumber: row.phoneNumber,
  });
}
