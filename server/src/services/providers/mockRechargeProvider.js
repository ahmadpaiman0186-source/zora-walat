/**
 * Mock recharge catalog — maps operator keys for future provider-specific catalogs.
 */

const DEFAULT_COUNTRY = 'AF';

/**
 * @param {object} p
 * @param {import('@prisma/client').Recipient} p.recipient
 * @param {string} p.operatorKey
 * @returns {import('../../domain/ports/rechargeProviderPort.js').QuoteResult}
 */
export function getQuote({ recipient, operatorKey }) {
  const op = String(operatorKey || recipient.operatorKey || '').trim();
  return {
    phone: recipient.e164,
    operator: op,
    countryCode: recipient.countryCode || DEFAULT_COUNTRY,
    recipientId: recipient.id,
    packages: [
      {
        id: 'mock_data_500mb',
        label: '500 MB · 7 days',
        type: 'data',
        priceUsd: 4.99,
      },
      {
        id: 'mock_data_1gb',
        label: '1 GB · 30 days',
        type: 'data',
        priceUsd: 11.99,
      },
      {
        id: 'mock_airtime_10',
        label: 'Airtime $10',
        type: 'airtime',
        priceUsd: 10,
      },
      {
        id: 'mock_airtime_25',
        label: 'Airtime $25',
        type: 'airtime',
        priceUsd: 25,
      },
    ],
  };
}

/**
 * @param {object} p
 * @param {import('@prisma/client').Recipient} p.recipient
 * @param {string} p.operatorKey
 * @param {string} p.packageId
 * @param {string} p.userId
 */
export function createOrder({ recipient, operatorKey, packageId, userId }) {
  const op = String(operatorKey || recipient.operatorKey || '').trim();
  return {
    success: true,
    orderId: `mock_${Date.now()}`,
    userId: String(userId),
    recipientId: recipient.id,
    phoneE164: recipient.e164,
    operator: op,
    packageId: String(packageId),
    status: 'PENDING_PAYMENT',
    message: 'Mock order created — use payment prepare / Stripe next',
  };
}
