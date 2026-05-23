# Zora-Walat — Stripe Webhook Rollback and Abort Plan

**Date:** 2026-05-23
**Status:** **PLAN ONLY** — rollback **NOT EXECUTED**
**Parent:** [IMPLEMENTATION_APPROVAL_GATE](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md)

---

## 1. Purpose

Define abort criteria, rollback steps, money-path fail-closed mode, and evidence required before reopening the controlled pilot gate — for **future** fast ACK implementation only.

**No rollback executed in this documentation task.**

---

## 2. Abort criteria (stop work before deploy)

Abort implementation work **without** staging deploy if:

| ID | Condition | Action |
|----|-----------|--------|
| AB-01 | Test matrix critical rows fail in CI | Halt merge; fix or revert branch |
| AB-02 | Idempotency test duplicate PAID detected | Halt; no deploy |
| AB-03 | Signature verification regression | Halt |
| AB-04 | Scope creep outside [allowed changeset](./ZORA_WALAT_STRIPE_WEBHOOK_IMPLEMENTATION_ALLOWED_CHANGESET_2026_05_23.md) | Halt; require AP-01 amendment |
| AB-05 | AP-01…AP-03 revoked or expired | Halt branch work |
| AB-06 | secrets:scan failure | Halt commit |

---

## 3. Rollback criteria (after staging deploy)

Initiate rollback if **any**:

| ID | Condition | Severity |
|----|-----------|----------|
| RB-01 | Stripe delivery failures > 0 for `checkout.session.expired` in 1h post-deploy | **Critical** |
| RB-02 | `processing_failed` without recovery in 15m | **High** |
| RB-03 | Duplicate order/wallet effect detected | **Critical** |
| RB-04 | Paid access granted without payment proof | **Critical** |
| RB-05 | p95 ack latency > 4s sustained 15m | **High** |
| RB-06 | Unplanned DB migration side effect | **Critical** |

---

## 4. Git revert plan (plan only)

| Step | Action | Owner |
|------|--------|-------|
| 1 | Identify last known-good SHA (pre-feat merge) | Engineering |
| 2 | `git revert` merge commit **or** deploy previous SHA via Vercel | Engineering |
| 3 | File Ap786 attestation: SHA before/after (no secrets) | Operator |
| 4 | CI green on reverted branch | CI |
| 5 | **Do not** force-push main without explicit approval | Program |

**Forbidden:** `git push --force` to main/master without user explicit request.

---

## 5. Deploy rollback plan (plan only)

| Step | Action |
|------|--------|
| 1 | Vercel → project `zora-walat-api-staging` → Deployments → promote previous |
| 2 | Verify `/webhooks/stripe` health (synthetic GET if exists; webhook POST only with approval) |
| 3 | Confirm Stripe dashboard shows deliveries on reverted behavior |
| 4 | Capture redacted PNG evidence → Ap786 |

**Production rollback:** Same pattern — **only** with AP-08 + incident commander; **NOT APPROVED** today.

---

## 6. Feature flag / kill switch requirement

If implementation adds async processing, **must** ship:

| Control | Requirement |
|---------|-------------|
| Kill switch env | e.g. `WEBHOOK_ASYNC_PROCESSING_ENABLED` (name TBD at implement) |
| Default staging | Documented in runbook — **not set in git** |
| Kill switch test | Rollback drill RB-FLAG-01 before staging sign-off |
| Behavior when OFF | Sync fallback **or** fail-closed queue drain — **design decision at Track H** |

Ref: [FAST_ACK_ASYNC_PROCESSING_DESIGN §8](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_ASYNC_PROCESSING_DESIGN_2026_05_23.md).

---

## 7. Incident escalation

| Level | Trigger | Escalate to |
|-------|---------|-------------|
| L1 | Single staging delivery failure | On-call engineering |
| L2 | RB-01 or RB-05 sustained | Payments + SRE |
| L3 | RB-03 or RB-04 (money-path) | IC + Payments + Security; **kill switch** |
| L4 | Prod impact (out of scope today) | Board notification path per IR runbook |

Ref: [SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW](./SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md).

---

## 8. Money-path lock / fail-closed mode

On RB-03 or RB-04:

| Action | Detail |
|--------|--------|
| Enable fail-closed | Block new fulfillments pending reconciliation |
| Do **not** auto-refund | Separate G-03 approval |
| Do **not** auto-credit wallet | Human + Payments |
| Queue manual reconciliation | [Manual path](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_ASYNC_PROCESSING_DESIGN_2026_05_23.md) §7 |
| Stripe endpoint isend | **FORBIDDEN** without G-02 |

---

## 9. Reconciliation steps (post-incident)

| Step | Action | Approval |
|------|--------|----------|
| 1 | Export redacted outbox rows (enum states only in Ap786) | Engineering |
| 2 | Compare Stripe test dashboard event types vs order states | Payments |
| 3 | Document mismatches | Operator |
| 4 | Manual fix per order (if any) | **Explicit user + Payments** |
| 5 | File `RECON-ATTESTATION-*.md` in Ap786 | Required |

---

## 10. Evidence required before reopening pilot gate

Per [CONTROLLED_REAL_MONEY_PILOT_GATE](./ZORA_WALAT_CONTROLLED_REAL_MONEY_PILOT_GATE_2026_05_23.md), after rollback:

| # | Evidence | Status |
|---|----------|--------|
| E-01 | Root cause of rollback documented (may remain **NOT CONFIRMED** for May 19) | **PENDING** |
| E-02 | Staging replay PASS re-filed | **PENDING** |
| E-03 | 24h clean Stripe delivery window | **PENDING** |
| E-04 | Rollback drill RB-01…04 filed | **PENDING** |
| E-05 | AP-09 pilot re-approval | **PENDING** |

**Pilot gate remains NO-GO** until E-01…E-05 satisfied.

---

## 11. Verdict

| Verdict | Value |
|---------|-------|
| Rollback plan | **FILED** |
| Rollback executed | **NOT EXECUTED** |
| Fix | **NOT EXECUTED** |
| Production / pilot | **NO-GO** |

---

*Rollback and abort plan · plan only · drills NOT EXECUTED*
