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
    trustRibbon: 'Secure checkout · Stripe',
    stagingBadge: 'Staging preview',
  },
  hero: {
    headlineLead: 'Send credit ',
    headlineAccent: 'worldwide',
    headlineTail: ' in minutes.',
    subline:
      'Multi-country mobile top-up with Stripe-hosted checkout — built for diaspora communities and frequent travelers.',
    statInstant: 'Fast delivery',
    statSecure: 'Stripe-hosted checkout',
    statCoverage: 'Multi-country catalog',
    routeFootnote: 'Route-aware catalog · Payment verified before fulfillment',
  },
  form: {
    title: 'Product & recipient',
    subtitle:
      'Choose product, destination operator, and amount. You’ll review the total before payment.',
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
    continueCta: 'Continue to Stripe Checkout',
    continuing: 'Preparing checkout…',
    stripeRedirectNote:
      'You’ll be redirected to Stripe Checkout to pay securely. Payment is not complete until Stripe confirms.',
    validationPhone: 'Enter a valid mobile number.',
    validationOperator: 'Choose an operator.',
    validationProduct: 'Choose a price option.',
    validationApi: 'Payment service is not configured for this deployment.',
    validationStripe: 'Payment setup is incomplete. Contact support if this persists.',
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
    stripeRedirectReminder: 'Complete payment on Stripe’s secure page.',
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
  trust: {
    title: 'How we keep payments safe',
    stripe: 'Checkout is powered by Stripe — industry-standard card processing.',
    verify: 'Payment confirmation is verified before fulfillment starts.',
    tracking: 'Refund and fulfillment states are tracked to reduce duplicate delivery risk.',
    noStore: 'We do not store your full card number on our servers.',
  },
  success: {
    title: 'Payment successful',
    body: 'Payment confirmed. We’re processing your top-up and will update status as delivery progresses.',
    again: 'Send another top-up',
  },
  orderReceipt: {
    title: 'Payment confirmed',
    subtitle:
      'Your order is confirmed. Fulfillment status updates as the operator processes your top-up.',
    orderId: 'Order ID',
    route: 'Route',
    product: 'Product',
    operator: 'Operator',
    recipient: 'Recipient',
    plan: 'Plan / amount',
    total: 'Total charged',
    payment: 'Payment status',
    fulfillment: 'Fulfillment status',
    paymentRef: 'Payment reference',
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
      'Orders from this session. Sign in for full order history across devices.',
    empty: 'No orders yet — complete a top-up to see it here.',
    refLabel: 'Reference',
    loadError: 'Could not load orders.',
    refresh: 'Refresh',
  },
  error: {
    /** @deprecated UI uses `buildStripePublishableKeySetupMessage` / diagnostics */
    configStripe: 'Missing publishable key in environment.',
    configApi:
      'Payment service is unavailable on this deployment. Contact support if this persists.',
    stripeInit: 'Payment SDK could not load.',
    network: 'Cannot reach the API. Is the server running?',
    requestTimeout: 'The payment API took too long to respond. Try again.',
    noSecret: 'No client secret returned.',
    orderCreate: 'Could not create your order. Check the API and try again.',
    orderFinalize:
      'Payment went through but we could not finalize the order. Note your payment reference and contact support.',
    paymentRedirectFailed:
      'Your bank did not confirm the payment. You can try again or use another card.',
  },
};

export type UiMessages = typeof en;
