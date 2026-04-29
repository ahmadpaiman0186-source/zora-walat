import { isRestrictedDestinationIso } from '../compliance/restrictedCodes';
import { MOCK_CATALOG, normalizeOffer } from './mockCatalog';
import type { CatalogRow, CountryOption, ProductType } from './types';

/** Origin markets (sender). */
export const ORIGIN_COUNTRIES: CountryOption[] = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'EU', label: 'European Union' },
  { code: 'TR', label: 'Turkey' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SA', label: 'Saudi Arabia' },
];

/** Receive / top-up destinations (sanctioned jurisdictions excluded per denylist). */
const DESTINATION_COUNTRIES_ALL: CountryOption[] = [
  { code: 'AF', label: 'Afghanistan' },
  { code: 'TR', label: 'Turkey' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'QA', label: 'Qatar' },
  { code: 'KW', label: 'Kuwait' },
  { code: 'OM', label: 'Oman' },
  { code: 'BH', label: 'Bahrain' },
];
export const DESTINATION_COUNTRIES: CountryOption[] =
  DESTINATION_COUNTRIES_ALL.filter((c) => !isRestrictedDestinationIso(c.code));

export const PRODUCT_TYPE_IDS: ProductType[] = ['airtime', 'data', 'calling'];

function activeSorted(): CatalogRow[] {
  return MOCK_CATALOG.filter((r) => r.isActive)
    .map(normalizeOffer)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function countryLabel(
  code: string,
  list: CountryOption[],
): string {
  return list.find((c) => c.code === code)?.label ?? code;
}

export function operatorsForDestination(
  destinationCode: string,
  productType: ProductType,
): { key: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const row of activeSorted()) {
    if (row.destinationCountry !== destinationCode) continue;
    if (row.productType !== productType) continue;
    if (!seen.has(row.operatorKey)) {
      seen.set(row.operatorKey, row.operatorLabel);
    }
  }
  return Array.from(seen.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getOffer(
  destinationCode: string,
  productType: ProductType,
  operatorKey: string,
): CatalogRow | undefined 
{
  const row = activeSorted().find(
    (r) =>
      r.destinationCountry === destinationCode &&
      r.productType === productType &&
      r.operatorKey === operatorKey,
  );
  return row ? normalizeOffer(row) : undefined;
}

export function firstPriceOptionCents(row: CatalogRow | undefined): number {
  const opt = row?.amountOptions[0];
  return opt?.priceUsdCents ?? 500;
}
