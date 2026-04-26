import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';
import { POST_PAYMENT_INCIDENT_MAP_SOURCE } from '../constants/postPaymentIncidentMapSource.js';
import { writeOrderAudit } from './orderAuditService.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
import { orchestrateStripeCall } from './reliability/reliabilityOrchestrator.js';

/**
 * @param {unknown} obj Stripe Charge or similar
 * @returns {string | null}
 */
export function stripePaymentIntentIdFromObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const pi = /** @type {{ payment_intent?: unknown }} */ (obj).payment_intent;
  if (typeof pi === 'string' && pi.startsWith('pi_')) return pi;
  if (pi && typeof pi === 'object' && 'id' in pi && typeof /** @type {{ id: unknown }} */ (pi).id === 'string') {
    const id = /** @type {{ id: string }} */ (pi).id;
    return id.startsWith('pi_') ? id : null;
  }
  return null;
}

/**
 * Stripe `charge.dispute.created` — Dispute may include `payment_intent` or only `charge` id.
 * @param {unknown} dispute
 * @returns {string | null}
 */
export function stripePaymentIntentIdFromDispute(dispute) {
  const fromPi = stripePaymentIntentIdFromObject(dispute);
  if (fromPi) return fromPi;
  return null;
}

/**
 * @param {unknown} dispute
 * @returns {string | null}
 */
export function stripeChargeIdFromDispute(dispute) {
  if (!dispute || typeof dispute !== 'object') return null;
  const ch = /** @type {{ charge?: unknown }} */ (dispute).charge;
  if (typeof ch === 'string' && ch.startsWith('ch_')) return ch;
  if (ch && typeof ch === 'object' && 'id' in ch) {
    const id = String(/** @type {{ id: unknown }} */ (ch).id ?? '');
    return id.startsWith('ch_') ? id : null;
  }
  return null;
}

/**
 * Record refund on Phase 1 PaymentCheckout rows for this PaymentIntent (Stripe money SoT; app mirrors for support).
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} charge Stripe Charge
 * @param {string} eventId `evt_…`
 */
export async function applyPhase1ChargeRefunded(tx, charge, eventId) {
  const piId = stripePaymentIntentIdFromObject(charge);
  if (!piId) return { updated: 0 };

  const row = await tx.paymentCheckout.findFirst({
    where: { stripePaymentIntentId: piId },
    select: { id: true },
  });
  if (!row) return { updated: 0 };

  await tx.paymentCheckout.update({
    where: { id: row.id },
    data: {
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
      postPaymentIncidentMapSource: POST_PAYMENT_INCIDENT_MAP_SOURCE.REFUND_CHARGE_PAYLOAD,
      postPaymentIncidentNotes: `stripe:charge.refunded ${String(eventId).slice(-14)}`,
      postPaymentIncidentUpdatedAt: new Date(),
    },
  });
  await writeOrderAudit(tx, {
    event: 'post_payment_incident',
    payload: {
      orderId: row.id,
      status: POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
      stripeEventIdSuffix: String(eventId).slice(-8),
    },
    ip: null,
  });
  emitPhase1OperationalEvent('charge_refunded_recorded', {
    orderIdSuffix: row.id.slice(-10),
    traceId: null,
  });
  return { updated: 1, orderId: row.id };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} dispute Stripe Dispute
 * @param {string} eventId
 * @param {{ stripe?: import('stripe').Stripe | null, log?: { warn?: Function } }} [ctx]
 */
export async function applyPhase1DisputeCreated(tx, dispute, eventId, ctx = {}) {
  const { stripe, log } = ctx;
  let piId = stripePaymentIntentIdFromDispute(dispute);
  let mapSource = piId ? POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_PAYLOAD_PI : null;

  if (!piId) {
    const chargeId = stripeChargeIdFromDispute(dispute);
    if (chargeId && stripe && typeof stripe.charges?.retrieve === 'function') {
      try {
        /** In-DB-transaction: single Stripe attempt (no multi-retry while holding locks). */
        const ch = await orchestrateStripeCall({
          operationName: 'charges.retrieve.dispute_map',
          traceId: null,
          log,
          maxAttempts: 1,
          backoffMs: [0],
          fn: () => stripe.charges.retrieve(chargeId),
        });
        piId = stripePaymentIntentIdFromObject(ch);
        if (piId) {
          mapSource = POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_CHARGE_LOOKUP;
        }
      } catch (e) {
        log?.warn?.(
          {
            securityEvent: 'dispute_charge_lookup_failed',
            stripeChargeIdSuffix: chargeId.slice(-10),
            err: String(e?.message ?? e).slice(0, 160),
          },
          'stripe webhook',
        );
        emitPhase1OperationalEvent('charge_dispute_charge_lookup_failed', {
          disputeMappingResolution: 'charge_lookup_failed',
          stripeDisputeIdSuffix: dispute?.id ? String(dispute.id).slice(-10) : null,
          stripeChargeIdSuffix: chargeId.slice(-10),
        });
      }
    }
  }

  if (!piId) {
    emitPhase1OperationalEvent('charge_dispute_unmapped', {
      disputeMappingResolution: 'unmapped',
      reason: 'no_payment_intent_resolved',
      stripeDisputeIdSuffix: dispute?.id ? String(dispute.id).slice(-10) : null,
      stripeChargeIdSuffix: stripeChargeIdFromDispute(dispute)?.slice(-10) ?? null,
    });
    return { updated: 0, reason: 'no_payment_intent_on_dispute' };
  }

  const row = await tx.paymentCheckout.findFirst({
    where: { stripePaymentIntentId: piId },
    select: { id: true },
  });
  if (!row) {
    emitPhase1OperationalEvent('charge_dispute_unmapped', {
      disputeMappingResolution: 'unmapped',
      reason: 'no_checkout_for_pi',
      stripePaymentIntentIdSuffix: piId.slice(-10),
    });
    return { updated: 0, reason: 'no_checkout_for_pi' };
  }

  await tx.paymentCheckout.update({
    where: { id: row.id },
    data: {
      postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED,
      postPaymentIncidentMapSource: mapSource,
      postPaymentIncidentNotes: `stripe:charge.dispute.created ${String(eventId).slice(-14)}`,
      postPaymentIncidentUpdatedAt: new Date(),
    },
  });
  await writeOrderAudit(tx, {
    event: 'post_payment_incident',
    payload: {
      orderId: row.id,
      status: POST_PAYMENT_INCIDENT_STATUS.DISPUTED,
      stripeEventIdSuffix: String(eventId).slice(-8),
      disputeMapSource: mapSource,
    },
    ip: null,
  });
  const disputeMappingResolution =
    mapSource === POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_CHARGE_LOOKUP
      ? 'charge_lookup'
      : 'payload_pi';
  emitPhase1OperationalEvent('charge_dispute_mapped', {
    disputeMappingResolution,
    orderIdSuffix: row.id.slice(-10),
    traceId: null,
  });
  emitPhase1OperationalEvent('dispute_created_recorded', {
    orderIdSuffix: row.id.slice(-10),
    traceId: null,
    disputeMappingResolution,
  });
  return { updated: 1, orderId: row.id, mapSource };
}
