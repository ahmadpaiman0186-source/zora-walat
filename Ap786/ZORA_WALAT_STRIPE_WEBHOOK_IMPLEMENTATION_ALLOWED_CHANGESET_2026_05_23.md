# Zora-Walat — Stripe Webhook Implementation Allowed Changeset

**Date:** 2026-05-23
**Status:** **SPEC ONLY** — all areas **PENDING APPROVAL**
**Parent:** [IMPLEMENTATION_APPROVAL_GATE](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md)

---

## 1. Purpose

Define the **maximum** code surface area permitted under a future approved implementation — and explicitly forbid everything else.

**Until AP-01…AP-03 pass:** no files outside this list may be edited on the implementation branch.

---

## 2. Changeset status

| Item | Status |
|------|--------|
| Changeset definition | **FILED** |
| Changeset approval | **PENDING** |
| Code branch | **NOT CREATED** |
| Code changes | **NOT STARTED** |

---

## 3. Allowed future code areas (PENDING APPROVAL)

Each row is **proposed allowed** — not authorized until [approval gate](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md) AP-01…AP-03 checked.

| Area ID | Path / module (indicative) | Allowed change type | Status |
|---------|---------------------------|---------------------|--------|
| **CS-01** | Stripe webhook route/handler (`POST /webhooks/stripe`) | Refactor to fast ACK ingress | **PENDING APPROVAL** |
| **CS-02** | Signature verification module | Hardening, tests only | **PENDING APPROVAL** |
| **CS-03** | Payment/order idempotency guard layer | New guards, unique constraints | **PENDING APPROVAL** |
| **CS-04** | Event persistence / outbox layer | Schema + repository (see CS-09) | **PENDING APPROVAL** |
| **CS-05** | Async worker / queue consumer | Process outbox rows | **PENDING APPROVAL** |
| **CS-06** | Structured logging (webhook lifecycle) | Log events per observability plan | **PENDING APPROVAL** |
| **CS-07** | `checkout.session.expired` handler path | Async expiry transition | **PENDING APPROVAL** |
| **CS-08** | Tests: webhook, idempotency, NPS, duplicate | Unit + integration | **PENDING APPROVAL** |
| **CS-09** | Migration files (outbox / processed_events) | **Files only** — execute requires AP-05 + G-07 | **PENDING APPROVAL** |
| **CS-10** | Feature flag / kill switch (env name only in code) | Read flag — **no env value in git** | **PENDING APPROVAL** |

**Out of scope even if approved:** frontend UI, unrelated API routes, billing catalog, marketing pages.

---

## 4. Forbidden changes (without separate approval)

| Forbidden item | Gate / reason |
|----------------|---------------|
| Production deploy | LAUNCH + AP-08 |
| Staging deploy | AP-07 |
| Env / secret changes | AP-04 + G-09 |
| Stripe dashboard settings | Human operator only |
| Webhook resend / replay | AP-06 + G-02 |
| DB migration **execution** | AP-05 + G-07 |
| Payment / refund / wallet mutations (manual or test) | Payments + ticket |
| Order PAID transition in test without harness | Money-path policy |
| Paid access / service delivery enablement | NPS gates |
| Broad frontend feature changes | Scope creep |
| Unrelated refactors | Scope creep |
| Credential rotation | G-01 |
| Self-healing apply | G-10 |
| Production-ready or fix-complete claims in docs | Ap786 honesty policy |
| Root cause **CONFIRMED** claim | EC-01…07 capture plan |

---

## 5. Architecture constraints (binding on allowed areas)

Implementation **must** implement:

1. Fast ACK after signature validation + durable receipt.
2. Async processing via queue/outbox.
3. Idempotency by Stripe event ID + business identity.
4. Zero duplicate transaction enforcement.
5. No-pay-no-service enforcement.
6. Fail-closed on uncertain payment state.
7. Audit trail for payment state transitions.
8. Retry-safe processing.
9. Observability-first lifecycle logs.
10. Manual reconciliation with explicit approval.

Ref: [FAST_ACK_ASYNC_PROCESSING_DESIGN](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_ASYNC_PROCESSING_DESIGN_2026_05_23.md).

---

## 6. File touch budget (guidance)

| Metric | Target |
|--------|--------|
| Max unrelated files per PR | **0** |
| Max directories outside server webhook/payment | **0** without AP-01 amendment |
| Test files | Required ≥ 1:1 with new production modules |

---

## 7. Review checklist (before first commit on feat branch)

| # | Check | Status |
|---|-------|--------|
| R-01 | Diff touches only CS-01…CS-10 paths | **PENDING** |
| R-02 | No `.env` or secret values | **PENDING** |
| R-03 | No production deploy workflow edits | **PENDING** |
| R-04 | `secrets:scan` clean | **PENDING** |
| R-05 | Test matrix rows mapped to new tests | **PENDING** |

---

## 8. Verdict

| Verdict | Value |
|---------|-------|
| Allowed changeset spec | **FILED** |
| Changeset approval | **PENDING** |
| Implementation | **NOT STARTED** |
| Fix | **NOT EXECUTED** |
| Production / pilot | **NO-GO** |

---

*Allowed changeset · pending approval · not authorized to code yet*
