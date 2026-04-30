import { isRestrictedDestinationIso } from './compliance/restrictedCodes';

/**
 * ITU-style dial digits (no leading +) and national-format hints per receiving country.
 * Used as the single source of truth for placeholder + API composition (dial + national digits).
 */
export type DestinationPhoneMeta = {
  /** E.164 country calling code digits only, e.g. "971" for UAE */
  dialDigits: string;
  /** Human placeholder for the national part only (no country code). */
  nationalPlaceholder: string;
  /** Digits-only example national number for stale-input detection on country switch. */
  exampleNationalDigits: string;
};

/** Phase 1: only Afghanistan receiving; aligns with `DESTINATION_COUNTRIES` in `catalog/queries.ts`. */
const AF_META: DestinationPhoneMeta = {
  dialDigits: '93',
  nationalPlaceholder: '70 123 4567',
  exampleNationalDigits: '701234567',
};

const BY_CODE: Record<string, DestinationPhoneMeta> = {
  AF: AF_META,
};

/** Same as AF — unknown codes should not occur when UI is AF-only; avoids wrong CC if misrouted. */
const FALLBACK: DestinationPhoneMeta = { ...AF_META };

/** Every destination offered in `DESTINATION_COUNTRIES` must have an entry above (dev check). */
const REQUIRED_DESTINATION_CODES = ['AF'] as const;

if (process.env.NODE_ENV === 'development') {
  for (const code of REQUIRED_DESTINATION_CODES) {
    if (!BY_CODE[code]) {
      // eslint-disable-next-line no-console
      console.warn(
        `[destinationPhoneMeta] Missing dial metadata for destination ${code}`,
      );
    }
  }
}

export function getDestinationPhoneMeta(countryCode: string): DestinationPhoneMeta {
  const k = String(countryCode ?? '').trim().toUpperCase();
  if (isRestrictedDestinationIso(k)) {
    throw new Error('Unsupported region');
  }
  return BY_CODE[k] ?? FALLBACK;
}

export function formatDialDisplay(dialDigits: string): string {
  const d = String(dialDigits ?? '').replace(/\D/g, '');
  return d ? `+${d}` : '';
}

/**
 * Full E.164 digit string without `+` for API (max length aligned with server normalizeTopupPhone).
 */
export function composeTopupPhoneDigits(
  countryCode: string,
  nationalRaw: string,
): string {
  const meta = getDestinationPhoneMeta(countryCode);
  const national = nationalRaw.replace(/\D/g, '');
  return `${meta.dialDigits}${national}`.slice(0, 20);
}

/**
 * When the receiving country changes: drop stale example, strip accidental pasted CC, keep plausible national typing.
 */
export function migrateNationalPhoneOnDestinationChange(
  nationalInput: string,
  previousCountryCode: string,
  nextCountryCode: string,
): string {
  const prev = getDestinationPhoneMeta(previousCountryCode);
  const next = getDestinationPhoneMeta(nextCountryCode);
  let d = nationalInput.replace(/\D/g, '');

  if (!d) return '';

  if (d === prev.exampleNationalDigits) {
    return '';
  }

  if (d.startsWith(prev.dialDigits)) {
    d = d.slice(prev.dialDigits.length);
  }
  if (d.startsWith(next.dialDigits)) {
    d = d.slice(next.dialDigits.length);
  }

  if (d === next.exampleNationalDigits) {
    return '';
  }

  return d;
}
