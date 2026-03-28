/** Final retail USD cents — must match Flutter TelecomCatalogLocal + PricingEngine. */
const SUFFIX_CENTS = {
  d250: Math.round(42 * 1.07),
  d1: Math.round(139 * 1.07),
  w3: Math.round(418 * 1.08),
  w8: Math.round(989 * 1.08),
  m12: Math.round(1488 * 1.1),
  m35: Math.round(3990 * 1.1),
};

const OPS = new Set(['roshan', 'mtn', 'etisalat', 'afghanWireless']);

export function getDataSku(productId) {
  const idx = productId.indexOf('_');
  if (idx <= 0) return null;
  const operatorKey = productId.slice(0, idx);
  const suffix = productId.slice(idx + 1);
  if (!OPS.has(operatorKey)) return null;
  const retailUsdCents = SUFFIX_CENTS[suffix];
  if (retailUsdCents == null) return null;
  return { operatorKey, retailUsdCents, id: productId, suffix };
}
