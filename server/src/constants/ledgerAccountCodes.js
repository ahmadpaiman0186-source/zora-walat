/**
 * L4 chart codes (seeded in `LedgerAccount`; see prisma migration `phase1_double_entry_ledger`).
 * `REVENUE_PLATFORM_NET` carries remainder after fee + provider allocation (balanced recognition).
 */
export const LEDGER_ACCOUNT_CODE = Object.freeze({
  ASSET_CASH_STRIPE: 'ASSET_CASH_STRIPE',
  LIABILITY_CUSTOMER: 'LIABILITY_CUSTOMER',
  REVENUE_SERVICE_FEE: 'REVENUE_SERVICE_FEE',
  EXPENSE_PROVIDER_COST: 'EXPENSE_PROVIDER_COST',
  CLEARING_PROVIDER: 'CLEARING_PROVIDER',
  REVENUE_PLATFORM_NET: 'REVENUE_PLATFORM_NET',
});

/** @typedef {typeof LEDGER_ACCOUNT_CODE[keyof typeof LEDGER_ACCOUNT_CODE]} LedgerAccountCode */
