/**
 * Complete English UI copy — source of shape for all locales.
 */
export const en = {
  lang: {
    ariaLabel: 'Language',
    names: {
      en: 'English',
      fa: 'فارسی',
      ar: 'العربية',
      tr: 'Türkçe',
    },
  },
  brand: {
    name: 'Zora-Walat',
    badge: 'Global telecom · Airtime, data & calling',
  },
  header: {
    navHowItWorks: 'How it works',
    navSupport: 'Support',
    navOrderHistory: 'Orders',
    trustRibbon: 'Bank-grade security · Test mode',
  },
  hero: {
    headlineLead: 'Send credit ',
    headlineAccent: 'worldwide',
    headlineTail: ' in minutes.',
    subline:
      'Multi-country mobile top-up with encrypted checkout — built for diaspora communities and frequent travelers.',
    statInstant: 'Near-instant delivery',
    statSecure: 'PCI-ready flow',
    statCoverage: 'Multi-country catalog',
    routeFootnote: 'Route-aware catalog · Provider routing is mocked',
  },
  form: {
    title: 'Product & recipient',
    subtitle:
      'Choose product, destination operator, and amount. Payment uses your selection (test mode).',
    productType: 'Product',
    productTypeAirtime: 'Airtime',
    productTypeData: 'Data',
    productTypeCalling: 'Calling',
    countryFrom: 'Sending from',
    countryTo: 'Receiving in',
    operator: 'Mobile operator',
    operatorPlaceholder: 'Select operator',
    phone: 'Mobile number',
    phoneHint: 'Local number without leading 0 where possible',
    bundleOrAmount: 'Plan or amount',
    bundleOrAmountHint: 'Prices in USD — charged to your card',
    continueCta: 'Continue to secure payment',
    continuing: 'Securing checkout…',
    validationPhone: 'Enter a valid mobile number.',
    validationOperator: 'Choose an operator.',
    validationProduct: 'Choose a price option.',
    amountSubtitle: 'USD · charged to your card',
    selectOperatorForPrices: 'Select an operator to see plans and prices.',
  },
  summary: {
    title: 'Payment summary',
    route: 'Route',
    product: 'Product',
    plan: 'Plan',
    operator: 'Operator',
    recipient: 'Recipient',
    subtotal: 'Service value',
    fees: 'Processing',
    feesIncluded: 'Included',
    total: 'Total charged',
    notSet: '—',
  },
  payment: {
    title: 'Secure payment',
    subtitle:
      'Card details are handled by Stripe. We never store your full card number.',
    loadingStripeSdk: 'Loading Stripe…',
    processing: 'Processing…',
    payWithAmount: 'Pay',
    badgeLock: 'Encrypted',
    badgeStripe: 'Stripe',
  },
  success: {
    title: 'Payment successful',
    body: 'Your test payment completed. In production, we would queue fulfillment using the product code you selected.',
    again: 'Send another top-up',
  },
  orderReceipt: {
    title: 'Payment confirmed',
    subtitle:
      'Your order is on file. Carrier delivery will attach when provider APIs are wired — nothing is sent yet in this build beyond payment capture.',
    orderId: 'Order ID',
    route: 'Route',
    product: 'Product',
    operator: 'Operator',
    recipient: 'Recipient',
    plan: 'Plan / amount',
    total: 'Total charged',
    payment: 'Payment status',
    fulfillment: 'Fulfillment status',
    paymentRef: 'Stripe PaymentIntent',
    payPending: 'Pending',
    payPaid: 'Paid',
    payFailed: 'Failed',
    payRefunded: 'Refunded',
    fulPending: 'Pending',
    fulQueued: 'Queued',
    fulProcessing: 'Processing',
    fulDelivered: 'Delivered',
    fulFailed: 'Failed',
  },
  history: {
    title: 'Recent orders',
    subtitle:
      'Orders for this browser session (local dev). Sign-in scoped history will replace this.',
    empty: 'No orders yet — complete a top-up to see it here.',
    refLabel: 'Reference',
    loadError: 'Could not load orders.',
    refresh: 'Refresh',
  },
  error: {
    configStripe: 'Missing publishable key in environment.',
    configApi:
      'Payment API URL is not configured. Set NEXT_PUBLIC_API_URL for this deployment.',
    stripeInit: 'Payment SDK could not load.',
    network: 'Cannot reach the API. Is the server running?',
    requestTimeout: 'The payment API took too long to respond. Try again.',
    noSecret: 'No client secret returned.',
    orderCreate: 'Could not create your order. Check the API and try again.',
    orderFinalize:
      'Payment went through but we could not finalize the order. Note your PaymentIntent and contact support.',
    paymentRedirectFailed:
      'Your bank did not confirm the payment. You can try again or use another card.',
  },
};

export type UiMessages = typeof en;
