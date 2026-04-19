/**
 * Deterministic provider execution correlation for Phase 1 airtime fulfillment.
 *
 * - Stable for the lifetime of a `FulfillmentAttempt` row (same id across worker retries).
 * - Safe to log and embed in JSON `requestSummary` / `responseSummary` (no secrets).
 *
 * @param {string} fulfillmentAttemptId — `FulfillmentAttempt.id` (cuid)
 * @param {string} [paymentCheckoutId] — `PaymentCheckout.id` (redundant check for operators)
 * @returns {string}
 */
export function buildProviderExecutionCorrelationId(
  fulfillmentAttemptId,
  paymentCheckoutId = '',
) {
  const a = String(fulfillmentAttemptId ?? '').trim();
  if (!a) return '';
  const o = String(paymentCheckoutId ?? '').trim();
  return o ? `zw_pe:${a}:ord_${o.slice(-12)}` : `zw_pe:${a}`;
}

/**
 * Reloadly `customIdentifier` for Phase 1 airtime — **one stable string per FulfillmentAttempt row**.
 *
 * - When `fulfillmentAttemptId` is set (normal worker path): `zwr_{cuid}` — matches DB PK; aligns with
 *   {@link buildProviderExecutionCorrelationId} (same attempt id); powers inquiry + Redis registry + reports.
 * - Fallback (no attempt id): legacy `${paymentCheckoutId}_a${n}` for backward-compatible tests/scripts.
 *
 * Reloadly accepts bounded-length identifiers; we cap at 120 chars (existing call sites).
 *
 * @param {string} paymentCheckoutId — `PaymentCheckout.id`
 * @param {string | null | undefined} fulfillmentAttemptId — `FulfillmentAttempt.id`
 * @param {number} [attemptNumberFallback] — used only when attempt id is missing
 * @returns {string}
 */
export function buildReloadlyPhase1CustomIdentifier(
  paymentCheckoutId,
  fulfillmentAttemptId,
  attemptNumberFallback = 1,
) {
  const aid = String(fulfillmentAttemptId ?? '').trim();
  if (aid) {
    return `zwr_${aid}`.slice(0, 120);
  }
  const oid = String(paymentCheckoutId ?? '').trim();
  const n = Number.isFinite(Number(attemptNumberFallback))
    ? Math.max(1, Math.floor(Number(attemptNumberFallback)))
    : 1;
  return `${oid}_a${n}`.slice(0, 120);
}

/**
 * Single bundle for logs, DB `requestSummary`, and support DTOs — same attempt row, two string forms.
 *
 * @param {string} paymentCheckoutId
 * @param {string | null | undefined} fulfillmentAttemptId
 * @returns {null | {
 *   providerExecutionCorrelationId: string,
 *   reloadlyCustomIdentifier: string,
 *   fulfillmentAttemptIdSuffix: string,
 *   identityAlignmentNote: string,
 * }}
 */
export function buildPhase1ProviderIdentityBundle(paymentCheckoutId, fulfillmentAttemptId) {
  const o = String(paymentCheckoutId ?? '').trim();
  const a = String(fulfillmentAttemptId ?? '').trim();
  if (!o || !a) return null;
  return {
    providerExecutionCorrelationId: buildProviderExecutionCorrelationId(a, o),
    reloadlyCustomIdentifier: buildReloadlyPhase1CustomIdentifier(o, a, 1),
    fulfillmentAttemptIdSuffix: a.slice(-12),
    identityAlignmentNote:
      'Same FulfillmentAttempt.id in zw_pe logs and zwr_ Reloadly customIdentifier (POST, reports inquiry, Redis idempotency registry)',
  };
}

/**
 * Embedded under `supportCorrelationChecklist.providerExecutionEvidence`.
 *
 * @param {{
 *   checkoutId: string,
 *   fulfillmentAttemptId: string | null,
 *   latestProviderReference: string | null,
 * }} p
 */
export function buildProviderExecutionEvidenceBlock(p) {
  const checkoutId = typeof p.checkoutId === 'string' ? p.checkoutId : '';
  const attemptId = p.fulfillmentAttemptId != null ? String(p.fulfillmentAttemptId) : null;

  let correlationId = null;
  let reloadlyCustomIdentifierWhenReloadly = null;
  let identityAlignmentNote = null;

  if (attemptId && checkoutId) {
    const bundle = buildPhase1ProviderIdentityBundle(checkoutId, attemptId);
    if (bundle) {
      correlationId = bundle.providerExecutionCorrelationId;
      reloadlyCustomIdentifierWhenReloadly = bundle.reloadlyCustomIdentifier;
      identityAlignmentNote = bundle.identityAlignmentNote;
    }
  } else if (attemptId) {
    correlationId = buildProviderExecutionCorrelationId(attemptId);
  }

  return {
    schemaVersion: 1,
    fulfillmentAttemptId: attemptId,
    providerExecutionCorrelationId: correlationId,
    latestProviderReference:
      p.latestProviderReference != null ? String(p.latestProviderReference).slice(0, 128) : null,
    /** When Reloadly is the airtime provider, POST/inquiry/registry use this id (same attempt row). */
    reloadlyCustomIdentifierWhenReloadly,
    identityAlignmentNote,
    linkage:
      'FulfillmentAttempt.id scopes provider I/O; correlation id is derived from attempt id for log/JSON alignment',
    singleExecutionNote:
      'Only one worker wins QUEUED→PROCESSING claim; PROCESSING retries do not re-invoke adapter without a new attempt row',
  };
}
