# STR-14 Runtime Proof Runbook

**Date:** 2026-05-27
**Status:** **RUNBOOK FILED — NOT EXECUTED**
**Gate:** [ZORA_WALAT_STR14_RUNTIME_PROOF_EXECUTION_APPROVAL_GATE_2026_05_27.md](./ZORA_WALAT_STR14_RUNTIME_PROOF_EXECUTION_APPROVAL_GATE_2026_05_27.md)

---

## 1. Purpose

Phased operator runbook for post-STR-12 staging runtime proof **after** explicit STR-14 approval phrases are issued.

This runbook contains **no** live secrets, **no** production endpoints, and **no** commands that mutate production, Stripe, Vercel, DB, or payments.

Public staging route reference (already in prior Ap786 docs):

```text
https://zora-walat-api-staging.vercel.app/webhooks/stripe
```

Target Vercel project (prior STR packs): `zora-walat-api-staging`

---

## 2. Global abort rules

Stop immediately if:

- Required approval phrase for the phase is missing or ambiguous.
- Live mode, production endpoint, or real-money path is encountered.
- Any payment/wallet/order/refund mutation is requested or observed.
- Uncertainty exists about deployment project, commit lineage, or capture window.
- Operator cannot attest read-only scope for the phase.

On abort: file **NOT EXECUTED** for the phase; do not infer PASS.

---

## Phase 0 — Preflight repo / main clean state

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 0.1 | Confirm `main` clean and synced with `origin/main` | None (read-only git status) | **NO** |
| 0.2 | Confirm STR-12 PR **#87**, STR-12 evidence PR **#89**, STR-13 PR **#90** merged on `main` | None (read-only log/docs) | **NO** |
| 0.3 | Record baseline commit SHA and date in STR14-C01 evidence | None | **NO** |
| 0.4 | Confirm no STR-14 execution phrase issued yet for upcoming phase | Gate doc review | **NO** |

**Exit criteria:** STR14-C01 **CAPTURED** (or remain **PENDING** if not yet run).

---

## Phase 1 — Read-only deployment verification

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 1.1 | Open Vercel dashboard for `zora-walat-api-staging` | STR14-AP01 optional; read-only UI | **NO** |
| 1.2 | Screenshot latest deployment commit/branch includes post-STR-12 lineage | Read-only capture | **NO** |
| 1.3 | Confirm deployment status visible (Ready vs failed) | Read-only | **NO** |
| 1.4 | File STR14-C02 evidence | None | **NO** |

**Forbidden in Phase 1:** deploy, redeploy, env edit, CLI deploy.

**Exit criteria:** STR14-C02 **CAPTURED**.

---

## Phase 2 — Route reachability evidence (only if approved)

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 2.1 | Verify staging route surface visible in deployment/functions list or approved read-only check | `APPROVE STR-14 READONLY STAGING ROUTE CHECK ONLY` | **NO** |
| 2.2 | Capture STR14-C03 expected surface evidence | Same phrase | **NO** |
| 2.3 | Capture STR14-C04 approved route check result | Same phrase | **NO** |

**Does not prove:** full webhook processing, signed Stripe event handling, idempotency, or money-path correctness.

**Forbidden unless AP02 issued:** HTTP POST probe, curl with body, synthetic invalid-signature request.

**Exit criteria:** STR14-C03, STR14-C04 **CAPTURED** or **NOT EXECUTED**.

---

## Phase 3 — Invalid-signature rejection proof (only if approved)

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 3.1 | Execute exactly one controlled invalid-signature request to staging `/webhooks/stripe` | `APPROVE STR-14 CONTROLLED INVALID SIGNATURE PROBE ONLY` | **NO** money-path mutation intended |
| 3.2 | Record HTTP status and timestamp (no secret headers in evidence) | Same phrase | **NO** |
| 3.3 | Capture STR14-C05 rejection evidence | Same phrase | **NO** |
| 3.4 | Do not retry without new approval | Policy | **NO** |

**Does not prove:** full Stripe event processing, durable audit under signed traffic, or production readiness.

**Forbidden:** Stripe resend/replay, live mode, second probe without new approval.

**Exit criteria:** STR14-C05 **CAPTURED** or **NOT EXECUTED**.

---

## Phase 4 — Vercel runtime log correlation (only if approved)

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 4.1 | Open Vercel Logs for correct deployment/time window | `APPROVE STR-14 READONLY VERCEL LOG CAPTURE ONLY` | **NO** |
| 4.2 | Search agreed markers (for example observability/audit markers documented in STR-05/STR-06/STR-12 packs) | Same phrase | **NO** |
| 4.3 | Screenshot result including timestamp and filter context | Same phrase | **NO** |
| 4.4 | If no logs found, record **NOT FOUND** — do not infer success | Same phrase | **NO** |
| 4.5 | File STR14-C06 | Same phrase | **NO** |

**Forbidden:** deploy/redeploy, env change, bundled probe without AP02.

**Exit criteria:** STR14-C06 **CAPTURED** or **NOT FOUND** filed honestly.

---

## Phase 5 — Durable audit persistence proof (only if approved)

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 5.1 | Read-only verification that audit metadata exists for agreed window | `APPROVE STR-14 READONLY DB AUDIT VERIFICATION ONLY` | **NO** writes |
| 5.2 | Redact PII/secrets/payloads in evidence | Policy | **NO** |
| 5.3 | If audit rows not found, record **NOT FOUND / INCONCLUSIVE** | Same phrase | **NO** |
| 5.4 | File STR14-C07 | Same phrase | **NO** |
| 5.5 | File STR14-C08 no money-path mutation attestation | Operator attestation | **NO** |

**Forbidden:** INSERT/UPDATE/DELETE, schema migration, payment tables mutation.

**Exit criteria:** STR14-C07, STR14-C08 **CAPTURED** or **NOT EXECUTED**.

---

## Phase 6 — Sandbox Stripe test event (only if approved)

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 6.1 | Trigger one sandbox/test-mode Stripe test event only | `APPROVE STR-14 SANDBOX STRIPE TEST EVENT ONLY` | Stripe test-mode only |
| 6.2 | Capture Stripe-side delivery evidence (dashboard screenshot) | Same phrase | **NO** |
| 6.3 | Correlate with Phase 4 logs if AP03 also issued | AP03 + AP05 | **NO** |
| 6.4 | Do not claim full processing proof without lifecycle/idempotency evidence | Policy | **NO** |

**Forbidden:** live mode, production webhook endpoint, replay/resend beyond approved single event scope.

**Note:** Phase 6 is optional and separate from Phases 2–5.

---

## Phase 7 — Final conservative verdict update

| Step | Action | Approval required | Mutates systems |
|------|--------|-------------------|-----------------|
| 7.1 | Update [STR14_FINAL_CONSERVATIVE_VERDICT.md](./evidence/str14-runtime-proof-execution-gate-2026-05-27/STR14_FINAL_CONSERVATIVE_VERDICT.md) only with captured evidence | After phases complete | **NO** |
| 7.2 | Mark STR14-C09 **CAPTURED** when verdict filed | None | **NO** |
| 7.3 | Preserve NO-GO for production/real-money/pilot unless future gates close | Policy | **NO** |

---

## 3. Runbook status (this filing)

| Phase | Status |
|-------|--------|
| Phase 0–7 | **NOT EXECUTED** |

---

*STR-14 runbook — planning only; no operational action executed*
