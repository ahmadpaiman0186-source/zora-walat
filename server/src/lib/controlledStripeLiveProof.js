import { env } from '../config/env.js';
import { isLocalControlledStripeLiveProofBypassActive } from './localCheckoutProofRuntime.js';

function digitsOnly(s) {
  return String(s ?? '').replace(/\D/g, '');
}

/**
 * @param {typeof env | Record<string, unknown>} e
 */
function proofEnvSlice(e) {
  return {
    controlledStripeLiveProof: Boolean(e.controlledStripeLiveProof),
    localControlledStripeLiveProofBypass: Boolean(
      e.localControlledStripeLiveProofBypass,
    ),
    phase1FulfillmentOutboundEnabled: Boolean(e.phase1FulfillmentOutboundEnabled),
    stripeLiveProofMaxFinalUsdCents:
      e.stripeLiveProofMaxFinalUsdCents != null
        ? Number(e.stripeLiveProofMaxFinalUsdCents)
        : null,
    stripeLiveProofAllowedRecipients: Array.isArray(e.stripeLiveProofAllowedRecipients)
      ? e.stripeLiveProofAllowedRecipients
      : [],
  };
}

/**
 * Opt-in guardrails for a controlled local Stripe **live** checkout proof session.
 * Inactive unless `ZW_CONTROLLED_STRIPE_LIVE_PROOF=true`.
 *
 * Local bypass ({@link isLocalControlledStripeLiveProofBypassActive} or explicit
 * `localControlledStripeLiveProofBypass` on `envOverride`) skips **only** the amount-cap and
 * recipient-allow-list checks. Outbound, config, and `recipient_required` still apply.
 *
 * @param {object} p
 * @param {number} p.finalPriceCents server-priced total (USD cents) charged via Stripe
 * @param {string | null} p.recipientNational normalized national digits when present
 * @param {boolean} p.hasOperatorAndRecipient both operatorKey and recipientPhone were sent
 * @param {typeof env} [envOverride] tests only — defaults to process env snapshot
 */
export function validateControlledStripeLiveProofCheckout(
  { finalPriceCents, recipientNational, hasOperatorAndRecipient },
  envOverride = env,
) {
  const hadExplicitLocalBypass =
    typeof envOverride === 'object' &&
    envOverride !== null &&
    Object.prototype.hasOwnProperty.call(
      envOverride,
      'localControlledStripeLiveProofBypass',
    );
  const ev = proofEnvSlice(envOverride);
  const localBypass = hadExplicitLocalBypass
    ? Boolean(ev.localControlledStripeLiveProofBypass)
    : isLocalControlledStripeLiveProofBypassActive();

  if (!ev.controlledStripeLiveProof) {
    return { ok: true };
  }

  if (ev.phase1FulfillmentOutboundEnabled === true) {
    return {
      ok: false,
      code: 'stripe_live_proof_outbound',
      message:
        'Controlled live proof requires PHASE1_FULFILLMENT_OUTBOUND_ENABLED to be unset or false',
    };
  }

  const max = ev.stripeLiveProofMaxFinalUsdCents;
  if (
    max == null ||
    !Number.isFinite(max) ||
    !Number.isInteger(max) ||
    max < 1
  ) {
    return {
      ok: false,
      code: 'stripe_live_proof_config',
      message:
        'Set ZW_STRIPE_LIVE_PROOF_MAX_FINAL_USD_CENTS when ZW_CONTROLLED_STRIPE_LIVE_PROOF is true',
    };
  }

  const allow = ev.stripeLiveProofAllowedRecipients;
  if (allow.length === 0) {
    return {
      ok: false,
      code: 'stripe_live_proof_config',
      message:
        'Set ZW_STRIPE_LIVE_PROOF_ALLOWED_RECIPIENTS when ZW_CONTROLLED_STRIPE_LIVE_PROOF is true',
    };
  }

  if (!hasOperatorAndRecipient || !recipientNational) {
    return {
      ok: false,
      code: 'stripe_live_proof_recipient_required',
      message:
        'Controlled live proof requires operatorKey and recipientPhone on the checkout request',
    };
  }

  if (!localBypass) {
    const n = Number(finalPriceCents);
    if (!Number.isInteger(n) || n > max) {
      return {
        ok: false,
        code: 'stripe_live_proof_amount_cap',
        message:
          'Checkout total exceeds controlled live proof maximum (ZW_STRIPE_LIVE_PROOF_MAX_FINAL_USD_CENTS)',
      };
    }

    const d = digitsOnly(recipientNational);
    const allowed = allow.some((x) => digitsOnly(x) === d);
    if (!allowed) {
      return {
        ok: false,
        code: 'stripe_live_proof_recipient_denied',
        message: 'Recipient is not on the controlled live proof allow-list',
      };
    }
  }

  return { ok: true };
}
