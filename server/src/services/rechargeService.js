/** Mock recharge catalog and orders for MVP. */

export function buildQuote({ phone, operator }) {
  return {
    phone: String(phone),
    operator: String(operator),
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

export function createMockOrder({ phone, operator, packageId }) {
  return {
    success: true,
    orderId: `mock_${Date.now()}`,
    phone: String(phone),
    operator: String(operator),
    packageId: String(packageId),
    status: 'PENDING_PAYMENT',
    message: 'Mock order created — use payment prepare / Stripe next',
  };
}
