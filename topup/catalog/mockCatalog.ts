import type { CatalogAmountOption, CatalogRow } from './types';
import { PHASE1_LADDER_USD_CENTS } from '../pricing/phase1LadderUsdCents';

function airtimeOptions(): CatalogAmountOption[] {
  return PHASE1_LADDER_USD_CENTS.map((c) => ({
    id: `air-${c}`,
    label: `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`,
    priceUsdCents: c,
  }));
}

function dataOptionsProfile(
  skus: { id: string; label: string; cents: number; detail: string }[],
): CatalogAmountOption[] {
  return skus.map((s) => ({
    id: s.id,
    label: s.label,
    priceUsdCents: s.cents,
    detail: s.detail,
  }));
}

function callingOptions(): CatalogAmountOption[] {
  const tiers: readonly [number, string][] = [
    [500, '~60 min*'],
    [1100, '~130 min*'],
    [2000, '~280 min*'],
  ];
  return tiers.map(([c, detail]) => ({
    id: `call-${c}`,
    label: `$${(c / 100).toFixed(0)} bundle`,
    priceUsdCents: c,
    detail,
  }));
}

type Op = { key: string; label: string };

/** Mock operators per destination — replace with provider directory later. */
export const OPERATORS_BY_DESTINATION: Record<string, Op[]> = {
  AF: [
    { key: 'awcc', label: 'Afghan Wireless (AWCC)' },
    { key: 'roshan', label: 'Roshan' },
    { key: 'etisalat-af', label: 'Etisalat Afghanistan' },
    { key: 'mtn-af', label: 'MTN Afghanistan' },
    { key: 'salaam', label: 'Salaam' },
  ],
  TR: [
    { key: 'turkcell', label: 'Turkcell' },
    { key: 'vodafone-tr', label: 'Vodafone Turkey' },
    { key: 'turk-telekom', label: 'Türk Telekom' },
  ],
  AE: [
    { key: 'etisalat-ae', label: 'Etisalat' },
    { key: 'du', label: 'du' },
  ],
  SA: [
    { key: 'stc-sa', label: 'STC' },
    { key: 'mobily', label: 'Mobily' },
    { key: 'zain-sa', label: 'Zain KSA' },
  ],
  QA: [
    { key: 'ooredoo-qa', label: 'Ooredoo Qatar' },
    { key: 'vodafone-qa', label: 'Vodafone Qatar' },
  ],
  KW: [
    { key: 'zain-kw', label: 'Zain Kuwait' },
    { key: 'ooredoo-kw', label: 'Ooredoo Kuwait' },
    { key: 'stc-kw', label: 'STC Kuwait' },
  ],
  OM: [
    { key: 'omantel', label: 'Omantel' },
    { key: 'ooredoo-om', label: 'Ooredoo Oman' },
  ],
  BH: [
    { key: 'batelco', label: 'Batelco' },
    { key: 'zain-bh', label: 'Zain Bahrain' },
  ],
};

/** Data-bundle retail faces — ladder-aligned USD cents only (same grid as airtime). */
const DATA_TIERS = dataOptionsProfile([
  { id: 'd1', label: '1 GB', cents: 500, detail: '30 days' },
  { id: 'd2', label: '3 GB', cents: 900, detail: '30 days' },
  { id: 'd3', label: '5 GB', cents: 1500, detail: '30 days' },
  { id: 'd4', label: '10 GB', cents: 2500, detail: '30 days' },
]);

function buildRowsForOp(
  dest: string,
  op: Op,
  baseOrder: number,
): CatalogRow[] {
  const air: CatalogRow = {
    id: `${dest}-${op.key}-airtime`,
    productType: 'airtime',
    destinationCountry: dest,
    operatorKey: op.key,
    operatorLabel: op.label,
    productName: `${op.label} · Airtime`,
    productCode: `${dest}-${op.key}-AIR`.toUpperCase(),
    amountOptions: airtimeOptions(),
    fixedPriceUsd: null,
    currency: 'USD',
    isActive: true,
    sortOrder: baseOrder,
  };
  const data: CatalogRow = {
    id: `${dest}-${op.key}-data`,
    productType: 'data',
    destinationCountry: dest,
    operatorKey: op.key,
    operatorLabel: op.label,
    productName: `${op.label} · Data bundle`,
    productCode: `${dest}-${op.key}-DATA`.toUpperCase(),
    amountOptions: DATA_TIERS,
    fixedPriceUsd: null,
    currency: 'USD',
    isActive: true,
    sortOrder: baseOrder + 1,
  };
  const call: CatalogRow = {
    id: `${dest}-${op.key}-calling`,
    productType: 'calling',
    destinationCountry: dest,
    operatorKey: op.key,
    operatorLabel: op.label,
    productName: `${op.label} · International calling`,
    productCode: `${dest}-${op.key}-CALL`.toUpperCase(),
    amountOptions: callingOptions(),
    fixedPriceUsd: null,
    currency: 'USD',
    isActive: true,
    sortOrder: baseOrder + 2,
  };
  return [air, data, call];
}

function buildAllRows(): CatalogRow[] {
  const rows: CatalogRow[] = [];
  let order = 0;
  for (const dest of Object.keys(OPERATORS_BY_DESTINATION)) {
    const ops = OPERATORS_BY_DESTINATION[dest] ?? [];
    for (const op of ops) {
      rows.push(...buildRowsForOp(dest, op, order));
      order += 10;
    }
  }
  return rows;
}

/** Central mock catalog — filter with queries in `queries.ts`. */
export const MOCK_CATALOG: CatalogRow[] = buildAllRows();

export function normalizeOffer(row: CatalogRow): CatalogRow {
  if (row.amountOptions.length > 0) return row;
  if (row.fixedPriceUsd != null && row.fixedPriceUsd > 0) {
    const cents = Math.round(row.fixedPriceUsd * 100);
    return {
      ...row,
      amountOptions: [
        {
          id: 'fixed',
          label: `$${row.fixedPriceUsd.toFixed(2)}`,
          priceUsdCents: cents,
        },
      ],
    };
  }
  return row;
}
