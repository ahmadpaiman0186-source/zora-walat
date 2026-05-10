# L37 — Provider outage and fallback runbook

**Scope:** Operational response when Reloadly (or configured fulfillment provider) is impaired. **Docs only** — execute steps only through approved tools and change control.

## Preconditions

- Know whether **airtime** and/or **web top-up** uses Reloadly in production (`AIRTIME_PROVIDER`, `WEBTOPUP_FULFILLMENT_PROVIDER`).
- Confirm Stripe webhook health separately — provider outage can coincide with payment noise.
- Have admin access paths documented in `runbooks/README.md` (reconciliation endpoints, DLQ).

## 1. Reloadly outage (broad)

**Symptoms:** Spike in provider errors, circuit open logs, widespread “processing,” vendor status page incident.

**Steps**

1. **Declare incident** per internal severity model; assign IC and comms.
2. **Measure blast radius:** error rate, regions, operator keys affected.
3. **Freeze risk amplifiers:** avoid mass config toggles; do **not** enable mock fallback for paid production traffic (see `PHASE1_PRODUCTION_SAFETY_GATES.md`).
4. **Customer comms:** delay/unknown ETA templates via support docs when available.
5. **Engineering:** preserve logs with correlation ids; capture order id **suffixes** only in shared channels.
6. **Vendor:** open ticket per escalation path recorded in `L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md`.

**Closure criteria:** error rate normalized, backlog drained or triaged, reconciliation report filed, post-incident actions assigned.

## 2. Provider latency spike

**Symptoms:** SLA timers firing, queue depth growing, no hard 5xx.

**Steps**

1. Differentiate **our** saturation vs vendor slowness (compare p95 vs historical).
2. If **Redis queue** enabled: inspect depth, worker health, DLQ.
3. Consider **throttling** new checkouts (product decision) before tuning retries.
4. **NO-GO:** lowering timeouts to “force success/failure” without inquiry discipline.

## 3. Provider auth failure

**Symptoms:** `reloadly_not_configured`, auth errors, startup validation failures.

**Steps**

1. Verify **secret presence** in deployment platform (names only in tickets).
2. Rotate credentials via **secret manager** process; avoid echoing values.
3. If paid orders exist without delivery path: follow **stuck fulfillment** section and exec escalation.

## 4. Provider quota exhausted

**Symptoms:** 429 / vendor emails / sudden client errors.

**Steps**

1. Reduce ingress (feature flag / rate limit) if available.
2. Request limit increase from vendor with business justification.
3. Document peak RPS vs contracted limits for post-incident review.

## 5. Stuck fulfillment

**Symptoms:** Paid orders not progressing; DLQ entries; worker errors.

**Steps**

1. Use admin reconciliation endpoints listed in `runbooks/README.md`.
2. For each order: Stripe PI state → attempt rows → provider reference suffix.
3. If **ambiguous** provider outcome: inquiry / report path before marking success.
4. Manual recovery only within **authority matrix** (see `server/docs/support/L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md` when that file exists on the branch).

## 6. Duplicate-risk incident

**Symptoms:** Suspected double send after timeout/retry; conflicting inquiry results.

**Steps**

1. **Stop** automated retries immediately for affected cohort.
2. Pull **inquiry** artifacts and compare `customIdentifier` / attempt ids.
3. Finance + support assess customer impact; disputes path per `PHASE1_REFUND_AND_DISPUTE.md`.
4. Post-incident: confirm `RELOADLY_INQUIRY_BEFORE_RETRY_DISABLED` is **not** set in prod without break-glass record.

## 7. Rollback to mock / sandbox in production

**Policy:** **Prohibited** for real customer money paths unless **explicit** written approval and allow flags per `PHASE1_PRODUCTION_SAFETY_GATES.md`.

- Mock/sandbox are for **labs**, **CI**, and **bounded rehearsal** — not a stealth production fallback.
- If demo environment needs mock in a production-shaped host, use isolated deployment + explicit allow envs — not mixed with live catalog.

## 8. Customer support handoff

- Provide: order id (suffix), timestamp, last known status, Stripe receipt state (customer-visible).
- **Do not:** promise provider-side outcomes without reconciliation proof.
- Escalate to engineering when duplicate-risk or denomination mismatch suspected.

## 9. Reconciliation after recovery

1. Run reconciliation queries / jobs per `FINANCE_TRUTH_AND_RECONCILIATION.md`.
2. Classify: delivered, refunded, still ambiguous.
3. File evidence pack (redacted) with counts and sample ids.

## 10. Evidence capture

- Dashboard screenshots (redacted), vendor ticket ids, timeline, config **names** changed (not values).
- Store under operator evidence directory convention; index in `L37_EVIDENCE_INDEX.txt` lineage when applicable.

## Related

- [L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md](../vendor/L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md)
- [L37_PROVIDER_FALLBACK_DECISION_MATRIX.md](../vendor/L37_PROVIDER_FALLBACK_DECISION_MATRIX.md)
- [RELOADLY_PRODUCTION_REHEARSAL.md](./RELOADLY_PRODUCTION_REHEARSAL.md)
- [L21_PROVIDER_FALLBACK.md](../L21_PROVIDER_FALLBACK.md)
