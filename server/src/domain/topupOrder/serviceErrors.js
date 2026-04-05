/**
 * Stable `err.code` values from web top-up service layer → HTTP mapping in controllers.
 * (Documentation + future HttpError wiring; controllers currently branch on e.code.)
 */
export const TOPUP_SERVICE_ERROR = {
  INVALID_ORDER: 'invalid_order',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  ORDER_NOT_PENDING: 'order_not_pending',
  CONCURRENT_UPDATE: 'concurrent_update',
  PI_MISMATCH_ORDER: 'pi_mismatch_order',
  STRIPE_NOT_TEST: 'stripe_not_test',
  STRIPE_MISSING: 'stripe_missing',
  INVALID_PI: 'invalid_pi',
  PI_CURRENCY: 'pi_currency',
  PI_AMOUNT: 'pi_amount',
  PI_NOT_SUCCEEDED: 'pi_not_succeeded',
  PI_METADATA_ORDER: 'pi_metadata_order',
  IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
};
