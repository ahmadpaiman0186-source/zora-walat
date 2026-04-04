import { getAirtimeSku } from '../../lib/pricing.js';
import {
  getDataPackageProviderCostUsdCents,
  getDataPackageRetailUsdCents,
} from '../../lib/dataPackagePricing.js';
import { MOCK_PACKAGE_ECONOMICS } from './packageCatalog.js';
import { PRODUCT_TYPES } from './productTypes.js';

/**
 * Future: pass { country, operatorKey, providerId } to select wholesale rows.
 * @typedef {{ productType: import('./productTypes.js').ProductType, providerCostCents: number, faceValueCents: number }} CatalogQuote
 */

/**
 * @param {string} packageId
 * @returns {CatalogQuote | null}
 */
export function resolveCatalogQuoteByPackageId(packageId) {
  const pid = String(packageId).trim();
  if (!pid) return null;

  const mock = MOCK_PACKAGE_ECONOMICS[pid];
  if (mock) {
    return {
      productType: mock.productType,
      providerCostCents: mock.providerUsdCents,
      faceValueCents: mock.faceValueUsdCents,
    };
  }

  const sku = getAirtimeSku(pid);
  if (sku) {
    if (sku.providerUsdCents == null) {
      return null;
    }
    return {
      productType: PRODUCT_TYPES.AIRTIME,
      providerCostCents: sku.providerUsdCents,
      faceValueCents: sku.retailUsdCents,
    };
  }

  const dataRetail = getDataPackageRetailUsdCents(pid);
  if (dataRetail != null) {
    const provider = getDataPackageProviderCostUsdCents(pid);
    if (provider == null) return null;
    return {
      productType: PRODUCT_TYPES.DATA_BUNDLE,
      providerCostCents: provider,
      faceValueCents: dataRetail,
    };
  }

  return null;
}

/**
 * Airtime preset amounts: face value is the selected retail cents; wholesale from ratio (env).
 * @param {number} amountCents
 * @param {number} providerBpsOfFace Thousandths of face (e.g. 9000 = 90%).
 */
export function resolveAmountOnlyAirtimeQuote(amountCents, providerBpsOfFace) {
  return {
    productType: PRODUCT_TYPES.AIRTIME,
    providerCostCents: Math.round((amountCents * providerBpsOfFace) / 10000),
    faceValueCents: amountCents,
  };
}
