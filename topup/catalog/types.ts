export type ProductType = 'airtime' | 'data' | 'calling';

/** One selectable price point (what we charge in Stripe, USD cents). */
export type CatalogAmountOption = {
  id: string;
  /** Shown on chip / summary */
  label: string;
  priceUsdCents: number;
  /** e.g. face value or GB label for data */
  detail?: string;
};

/**
 * Mock catalog row — one offering per (destination × product type × operator).
 * Provider integration can map productCode later.
 */
export type CatalogRow = {
  id: string;
  productType: ProductType;
  destinationCountry: string;
  operatorKey: string;
  operatorLabel: string;
  productName: string;
  productCode: string;
  amountOptions: CatalogAmountOption[];
  /** When set and amountOptions empty, treated as single SKU (derived option). */
  fixedPriceUsd: number | null;
  currency: string;
  isActive: boolean;
  sortOrder: number;
};

export type CountryOption = { code: string; label: string };
