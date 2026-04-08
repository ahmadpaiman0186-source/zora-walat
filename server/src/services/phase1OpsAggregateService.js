import { ORDER_STATUS } from '../constants/orderStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';
import { prisma } from '../db.js';
import { getOpsMetricsSnapshot } from '../lib/opsMetrics.js';
import { queryPhase1OperationalExceptionReport } from './phase1OperationalReportService.js';

/**
 * Single staff-facing snapshot: DB lifecycle counts (SoT) + in-process counters since restart (per instance).
 *
 * @param {object} [opts]
 * @param {import('@prisma/client').PrismaClient} [opts.prisma]
 */
export async function getPhase1OpsHealthSnapshot(opts = {}) {
  const db = opts.prisma ?? prisma;

  const [
    report,
    totalCheckouts,
    pendingCount,
    processingCount,
    refundedIncidentsCount,
    disputedIncidentsCount,
  ] = await Promise.all([
    queryPhase1OperationalExceptionReport({ prisma: db, emitStuckSignals: false }),
    db.paymentCheckout.count(),
    db.paymentCheckout.count({ where: { orderStatus: ORDER_STATUS.PENDING } }),
    db.paymentCheckout.count({ where: { orderStatus: ORDER_STATUS.PROCESSING } }),
    db.paymentCheckout.count({
      where: { postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.REFUNDED },
    }),
    db.paymentCheckout.count({
      where: { postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.DISPUTED },
    }),
  ]);

  const process = getOpsMetricsSnapshot();
  const counters = process.counters ?? {};

  return {
    generatedAt: new Date().toISOString(),
    ok: true,
    /** One-line hint for `/api/admin/ops/phase1-aggregated-health` + `?phase1=1` summary consumers. */
    telemetryClassification:
      'phase1.db.* = authoritative PostgreSQL (cluster-wide). phase1.processSinceRestart.* = best-effort per Node process (restart resets; sum in your observability stack for multi-instance).',
    metricsAuthority: {
      globalTruthPostgresql: {
        description:
          'Counts and breakdowns under phase1.db are read directly from PostgreSQL at request time — shared across all app instances.',
        keys: [
          'totalCheckouts',
          'pendingCheckouts',
          'paidOrders',
          'processingOrders',
          'deliveredOrders',
          'failedOrders',
          'cancelledOrders',
          'stuckOrderCandidates',
          'processingWithLatestFailedAttempt',
          'lowMarginOrders',
          'anomalyCountByCode',
          'postPaymentIncidentRefunded',
          'postPaymentIncidentDisputed',
        ],
      },
      bestEffortProcessLocal: {
        description:
          'phase1.processSinceRestart.* increments in this Node process only — resets on restart; use logs/metrics plane to sum clusters.',
        keys: [
          'checkoutSessionCreatedTotal',
          'checkoutPaidPhase1Total',
          'webhookTransactionCommitted',
          'webhookFailures',
          'paymentCheckoutOk',
          'paymentCheckoutFail',
          'fulfillmentDelivered',
          'fulfillmentFailed',
        ],
      },
    },
    phase1: {
      db: {
        totalCheckouts,
        pendingCheckouts: pendingCount,
        paidOrders: report.paidOrdersCount,
        processingOrders: processingCount,
        deliveredOrders: report.deliveredOrdersCount,
        failedOrders: report.failedOrdersCount,
        cancelledOrders: report.cancelledOrdersCount,
        stuckOrderCandidates: report.stuckCandidatesCount,
        processingWithLatestFailedAttempt: report.processingWithLatestFailedAttemptCount,
        lowMarginOrders: report.lowMarginPersistedCount,
        anomalyCountByCode: report.anomalyCountByCode,
        postPaymentIncidentRefunded: refundedIncidentsCount,
        postPaymentIncidentDisputed: disputedIncidentsCount,
      },
      processSinceRestart: {
        _authority:
          'best_effort_per_instance — not guaranteed equal to global volume; compare to phase1.db for money-path SoT.',
        checkoutSessionCreatedTotal: counters.checkout_session_created_total ?? 0,
        checkoutPaidPhase1Total: counters.checkout_paid_phase1_total ?? 0,
        webhookTransactionCommitted: counters.webhook_transaction_committed_total ?? 0,
        webhookFailures: counters.stripe_webhook_transaction_failed ?? 0,
        paymentCheckoutOk: counters.payment_checkout_ok ?? 0,
        paymentCheckoutFail: counters.payment_checkout_fail ?? 0,
        fulfillmentDelivered: counters.fulfillment_delivered ?? 0,
        fulfillmentFailed: counters.fulfillment_failed ?? 0,
        windows: process.windows,
      },
    },
    interpretation: {
      lifecycleCountsFromDb:
        'Order lifecycle + anomaly + post-payment incident columns are queried from PostgreSQL — authoritative across instances (see metricsAuthority.globalTruthPostgresql).',
      processCounters:
        'phase1.processSinceRestart is per-process telemetry only; never treat it as cluster-wide financial truth.',
      webhookFailures:
        'webhookFailures counts failed webhook transactions since this process started (not persisted in DB).',
    },
  };
}
