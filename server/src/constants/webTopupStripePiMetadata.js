/**
 * Embedded web top-up PaymentIntents always include this `metadata.source` value
 * when created via {@link ../controllers/paymentController.js}. Used by the slim
 * webhook path to distinguish real app-issued intents from Stripe CLI / foreign fixtures.
 */
export const WEBTOPUP_STRIPE_PI_METADATA_SOURCE = 'zora_walat_next_test';
