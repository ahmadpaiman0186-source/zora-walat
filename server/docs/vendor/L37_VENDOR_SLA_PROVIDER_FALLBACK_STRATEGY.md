# L37 — Vendor SLA / provider fallback strategy

## L37 scope

This document formalizes **vendor dependency**, **contractual SLA expectations**, and **operational fallback** for Phase 1 fulfillment where an external provider (primarily **Reloadly** for airtime / web top-up) sits between **Stripe payment capture** and **customer-visible delivery**.

L37 is **documentation and evidence requirements only**. It does **not** authorize live provider calls, production config changes, or vendor contact on behalf of the operator.

**In scope**

- Dependency map: payment rail vs fulfillment provider vs queue/Redis (when enabled).
- Provider mode matrix: mock, sandbox, live.
- Distinction between **vendor SLA** (contractual) and **service SLO** (internal targets; see observability docs).
- Fallback decision framing aligned with implemented policy in `L21_PROVIDER_FALLBACK.md` and `deliveryAdapter.js`.
- Kill-switch and degraded-mode behavior at the **product/ops** level (not live execution).
- Support and recovery handoff, security/compliance constraints, and explicit **NO-GO** conditions.

**Out of scope**

- Running Reloadly/Stripe production transactions, changing dashboards, or mutating third-party accounts.
- Replacing or extending code paths (a future “provider B” remains an explicit adapter change).

## Vendor dependency map

| Layer | Role | Primary failure effect |
|-------|------|-------------------------|
| **Stripe** | Payment authorization/capture, webhooks, disputes/refunds | Paid vs unpaid truth; webhook backlog affects fulfillment start |
| **Reloadly (or configured provider)** | Outbound top-up / fulfillment execution | Delivery failure, latency, ambiguity, quota/auth errors |
| **Application** | Idempotency, correlation (`customIdentifier` / attempt identity), retries, circuit breaker | Incorrect retries increase duplicate-risk; stuck states need reconciliation |
| **PostgreSQL** | Orders, attempts, webhook idempotency, ledger-related rows | Data drift if recovery steps bypass invariants |
| **Redis / BullMQ** (when `FULFILLMENT_QUEUE_ENABLED` and related settings apply) | Async fulfillment queue | Delayed delivery, DLQ depth, worker stalls |
| **Hosting (e.g. Vercel) / Neon** | Runtime and database availability | Broad outage; separate from single-provider incident |

Cross-reference: environment variables and boundaries are summarized in `server/.env.local.example` (names only; never commit secrets).

## Reloadly / provider role

- **Primary** outbound fulfillment for Phase 1 airtime when `AIRTIME_PROVIDER=reloadly`.
- **Web top-up** may use Reloadly under `WEBTOPUP_FULFILLMENT_PROVIDER` — rehearsal and proof must match **the path enabled in production**, not a different adapter (see `runbooks/RELOADLY_PRODUCTION_REHEARSAL.md`).
- **Mock** is a **non-live** adapter for labs and tightly gated scenarios; it is **not** a substitute for vendor SLA proof.

## Stripe vs fulfillment separation

| Concern | Stripe | Provider (Reloadly) |
|---------|--------|---------------------|
| **Money collection** | Yes | Provider bills **your** commercial relationship with Reloadly; customer payment is via Stripe |
| **Fulfillment truth** | Indirect (paid triggers pipeline) | **Authoritative** for whether airtime was sent, subject to inquiry/reconciliation |
| **Refund / dispute** | Stripe Dashboard / automated handlers | Financial remediation follows `PHASE1_REFUND_AND_DISPUTE.md`; no automatic “un-send” of airtime |

**Rule:** Payment success does not imply delivery success. Ambiguous or delayed provider outcomes require **reconciliation** before customer-facing certainty or alternate paths.

## Provider mode matrix: mock / sandbox / live

| Mode | Typical config signals | Customer money / provider money | Production use |
|------|------------------------|----------------------------------|----------------|
| **Mock** | `AIRTIME_PROVIDER=mock` (and web-top-up mock analog) | **No** real provider spend | **Blocked in production** unless explicit allow flags per `PHASE1_PRODUCTION_SAFETY_GATES.md` |
| **Sandbox** | `RELOADLY_SANDBOX=true`, sandbox URLs/credentials | **No** live Reloadly production spend | Rehearsal, golden paths — see `runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md` |
| **Live** | `RELOADLY_SANDBOX=false`, production credentials, outbound enabled | **Real** provider transactions | **Only** after evidence gates in `L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md` and org signoff |

## SLA vs SLO distinction

| Term | Meaning here |
|------|----------------|
| **Vendor SLA** | Contractual or published commitments from Reloadly (availability, support response, credits). Captured as **evidence artifacts**, not assumed from code. |
| **Internal SLO** | Error budget, burn rate, and alerting targets for **our** service — see observability / operations docs. Internal SLOs do **not** replace vendor SLA evidence. |

## Fallback decision model

Aligned with **implemented** behavior (see `L21_PROVIDER_FALLBACK.md`):

- **Success** from Reloadly → no mock fallback.
- **Failure** (terminal provider error) → **no** automatic mock chain; retry/terminal handling per fulfillment policy.
- **Pending / ambiguous** → **no** mock fallback; reconcile via inquiry/reports before assuming delivery.
- **Unavailable** (config/auth, etc.) → mock fallback **only** if `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true`; **this combination is rejected in production** when `AIRTIME_PROVIDER=reloadly` per `PHASE1_PRODUCTION_SAFETY_GATES.md`.
- **Outbound blocked** (`PHASE1_FULFILLMENT_OUTBOUND_ENABLED` false) → mock only under explicit policy / local proof flags — **not** a stealth production mode.

**Strategic rule:** There is **no** “silent” second live provider in this repository; a future secondary commercial provider requires a **new adapter** and its own SLA and duplicate-send controls.

## Kill-switch policy

Operational kill-switches (conceptual — actual toggles are env-driven and org-controlled):

- **Stop new outbound fulfillment:** disable outbound flag, freeze checkout, or use prelaunch/lockdown patterns as documented in launch/money-path docs — without deleting data or bypassing idempotency.
- **Disable unsafe fallbacks:** never enable `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK` with live Reloadly in production.
- **Queue mode:** if Redis queue is enabled, pausing workers increases backlog — coordinate with support and reconciliation playbooks.

**NO-GO:** Using mock/sandbox behavior **in place of** live fulfillment for real paying customers without explicit written approval and safety gates.

## Degraded-mode behavior

- **Provider slow:** SLA timers and circuit behavior (e.g. web-top-up durable circuit envs in `.env.local.example`) may shed load or fail closed; customer-visible status may remain “processing” until reconciliation.
- **Provider partial outage:** orders may cluster in verifying/stuck states — use admin reconciliation endpoints and runbooks (see `runbooks/README.md`).
- **Stripe healthy, provider down:** money path may show paid orders without delivery — **support and finance** procedures apply; see `L37_PROVIDER_OUTAGE_AND_FALLBACK_RUNBOOK.md`.

## Support / recovery handoff

- **Tier 1:** symptom classification per internal support taxonomy (link `server/docs/support/L30_*.md` when those files exist on the branch), gather order id suffixes, Stripe PI, timestamps.
- **Tier 2 / engineering:** reconciliation queries, worker/queue depth, provider inquiry outcome, idempotency keys.
- **Authority:** manual recovery boundaries per internal authority matrix (link `server/docs/support/L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md` when present) — no out-of-band ledger edits without governance.

## Security / compliance constraints

- **Secrets:** never paste Reloadly/Stripe keys into tickets or docs; use redacted evidence per `L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md`.
- **PII:** phone numbers and full identifiers stay out of unstructured logs (see `PRODUCTION_MONEY_PATH_CHECKLIST.md` logging section).
- **PCI:** card data flows through Stripe; do not request PAN/CVV in internal channels.

## NO-GO conditions

- Production **live** Reloadly without completed **evidence checklist** and signoff.
- Enabling mock fallback to “mask” provider outage for real customers.
- Disabling inquiry-before-retry or other duplicate-send guards **without** incident approval and post-incident reconciliation plan.
- Any change that moves real money or production provider state **without** change control — L37 docs do not authorize such actions.

## Related documents

- [L21_PROVIDER_FALLBACK.md](../L21_PROVIDER_FALLBACK.md) — implemented fallback matrix
- [PHASE1_PRODUCTION_SAFETY_GATES.md](../PHASE1_PRODUCTION_SAFETY_GATES.md) — startup gates
- [L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md](./L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md)
- [L37_PROVIDER_FALLBACK_DECISION_MATRIX.md](./L37_PROVIDER_FALLBACK_DECISION_MATRIX.md)
- [L37_VENDOR_RISK_REGISTER.md](./L37_VENDOR_RISK_REGISTER.md)
- [L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md](./L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md)
- [../runbooks/L37_PROVIDER_OUTAGE_AND_FALLBACK_RUNBOOK.md](../runbooks/L37_PROVIDER_OUTAGE_AND_FALLBACK_RUNBOOK.md)
