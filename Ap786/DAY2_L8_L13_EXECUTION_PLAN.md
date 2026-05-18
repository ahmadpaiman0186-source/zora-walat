# Day 2 execution plan — L-8 through L-13 (negative & refund paths)

**Program:** Zora-Walat Ap786 production-readiness  
**Prerequisite:** Day 1 closeout (`DAY1_CLOSEOUT_REPORT.md`) — L-1…L-7 complete or PASS (automated) as documented  
**Environment:** Staging API + Stripe **test mode** unless explicitly approved otherwise  
**Rules:** No secrets, env values, keys, JWTs, PII, or raw webhook payloads in evidence files.  
**Policy:** Phase 1 does **not** auto-refund from app code; `charge.refunded` mirrors incident state only (`PHASE1_STRIPE_REFUND_IS_WEBHOOK_MIRROR_ONLY`).

**Do not start** any row below until written approval exists for that level (chat/ticket line suggested per section).

---

## Prerequisite (before L-8)

| Step | Goal | Method | Pass |
|------|------|--------|------|
| **P-1** | Integration DB proof | **PASS (local 2026-05-18)** — `TEST_DATABASE_URL` on **127.0.0.1:5432** / `zora_walat_test`; migrate; focused chaos pattern **6/6** green. See `DAY1_CLOSEOUT_REPORT.md` §8. | Focused L-6/L-7 suite green |
| **P-2** | Operator session | **PASS (2026-05-18)** — operator login + `status-check` **200** on staging; terminal enums per `P2_OPERATOR_AUTH_RELIABILITY.md` §8. Harness: `5d6fa2f`. | `status-check` returns **200** |

---

## L-8 — Card declined

| Field | Content |
|-------|---------|
| **Goal** | Prove a **declined** test card does not mark the order PAID, does not fulfill, and leaves a safe terminal or pending-failed state. |
| **Status** | **PASS (2026-05-18)** — automated **10/10** + staging browser decline (card ending **0002**); post-decline `status-check` enums in `L8_CARD_DECLINED_SAFETY.md` §4c. |
| **Safe test method** | New hosted checkout in **test mode** only; pay with Stripe decline test PAN (e.g. `4000000000000002` — do not paste full card in evidence). Alternatively signed `payment_intent.payment_failed` fixture in integration DB **after approval**. |
| **Expected DB / order state** | `orderStatus` remains **PENDING** or moves to **CANCELLED** / payment row **PAYMENT_FAILED**; **no** `RECHARGE_COMPLETED`; **0** fulfillment attempts (or unchanged if abandon before pay). |
| **Pass criteria** | Operator or API read shows **not** `PAID_CONFIRMED`; `FULFILLMENT_ATTEMPT_COUNT` **0**; no erroneous PAID transition. |
| **Evidence to capture** | Enum-only `status-check` or sanitized API fields; event **type** string; HTTP status **200/4xx** as applicable — no payloads. |
| **Risks** | Confusing decline with webhook delay; creating real-looking PII in Stripe Dashboard — use test emails only. |
| **Stripe manual action required?** | **Yes** — staging decline test card (test mode); **complete** 2026-05-18. |

**Approval gate:** `Approved: L-8 card declined proof on staging` — **complete**

---

## L-9 — Checkout cancel (payer abandon)

| Field | Content |
|-------|---------|
| **Goal** | Prove payer hitting **cancel** / abandoning checkout does not PAID or fulfill. |
| **Status** | **PASS (2026-05-18)** — staging `/cancel` **200** (~1.2s); disposable test checkout; no payment; `status-check` enums in `L9_CHECKOUT_CANCEL_SAFETY.md` §5. |
| **Safe test method** | Create checkout; open Stripe hosted page; click **Back/Cancel** or navigate to app `/cancel` slim return URL; **do not** complete payment. Optional: `checkout.session.expired` webhook for same session after timeout (Dashboard or clock). |
| **Expected DB / order state** | Row stays **PENDING** or becomes **CANCELLED** with `PAYMENT_FAILED` / `failureReason` consistent with abandon or expiry; **no** fulfillment attempts. |
| **Pass criteria** | `PAID_CONFIRMED` **false**; fulfillment count **0**; cancel return page **200** (no 504). |
| **Evidence to capture** | Before/after operator enums; note cancel vs expired path in one line. |
| **Risks** | Session later completed in another tab — use disposable checkout per run. |
| **Stripe manual action required?** | **Partial** — abandon is user-driven; **optional** Dashboard expire/resend for `checkout.session.expired`. |

**Approval gate:** `Approved: L-9 checkout cancel / abandon proof on staging`

---

## L-10 — Expired checkout session

| Field | Content |
|-------|---------|
| **Goal** | Prove `checkout.session.expired` cancels a **pending** correlated checkout without PAID or fulfillment; unknown ids stay safe. |
| **Status** | **PASS (automated, 2026-05-18)** — focused tests **11/11** green; see `L10_EXPIRED_CHECKOUT_SESSION_SAFETY.md`. Staging Dashboard expire **not run**. |
| **Safe test method** | **Automated (already in repo):** `stripeWebhookHttpChaos` — expired on pending → **CANCELLED**; unknown id → no row. **Staging:** Dashboard expire session or wait for test-mode expiry on a disposable checkout **after approval**. |
| **Expected DB / order state** | Valid metadata + pending row → `orderStatus` **CANCELLED**, `status` **PAYMENT_FAILED**, `failureReason` includes expired semantics; **0** fulfillment. Unknown id → no new row. |
| **Pass criteria** | Matches automated test expectations on integration DB; staging operator enums align. |
| **Evidence to capture** | Enum-only before/after; reference test names in commit/evidence file — no session ids in git. |
| **Risks** | Expiring already-paid session — use only **unpaid** pending checkouts. |
| **Stripe manual action required?** | **No** for L-10 PASS (automated). **Optional** staging corroboration only. |

**Approval gate:** `Approved: L-10 expired checkout staging proof` (optional corroboration only)

---

## L-11 — Full refund

| Field | Content |
|-------|---------|
| **Goal** | Prove **full** `charge.refunded` after fulfillment updates **post-payment incident** to REFUNDED without corrupting ledger uniqueness or double-counting fulfillment. |
| **Safe test method** | Complete **one** test payment → fulfill (or mock terminal); issue **full** refund in Stripe Dashboard test mode **or** signed `charge.refunded` integration fixture (pattern in `stripeWebhookHttpChaos` — `charge.refunded after delivery`). |
| **Expected DB / order state** | `postPaymentIncidentStatus` **REFUNDED**; canonical financial anomaly codes remain unique; order lifecycle reflects refund mirror — **not** automatic app-initiated refund. |
| **Pass criteria** | Operator/support DTO shows REFUNDED incident; no second fulfillment attempt; no duplicate ledger capture events. |
| **Evidence to capture** | Sanitized incident status enums; mapSource enum if exposed — no charge ids. |
| **Risks** | Refunding wrong PI; partial vs full ambiguity — document amount bucket as full only. |
| **Stripe manual action required?** | **Yes** — Dashboard refund **or** approved signed webhook fixture. |

**Approval gate:** `Approved: L-11 full refund mirror proof on staging`

**Note:** Do **not** process refunds until this gate is explicit (Day 2 start instruction).

---

## L-12 — Partial refund

| Field | Content |
|-------|---------|
| **Goal** | Prove **partial** `charge.refunded` is recorded safely (incident/notes/amount semantics) without treating as full settlement reversal unless policy says so. |
| **Safe test method** | Paid test order → Stripe Dashboard **partial** refund (amount &lt; captured) **after approval**; capture operator/support readout. |
| **Expected DB / order state** | Incident reflects partial refund policy in `applyPhase1ChargeRefunded` / support projection (verify code path in desk review before run); order must not enter duplicate fulfillment. |
| **Pass criteria** | Documented expected incident state matches product policy; no duplicate fulfillment; enums stable on `status-check` if applicable. |
| **Risks** | Product may mirror all refunds as REFUNDED — desk-review `phase1StripeChargeIncidents.js` before claiming partial semantics. |
| **Stripe manual action required?** | **Yes** — partial refund in test mode. |

**Approval gate:** `Approved: L-12 partial refund proof on staging`

---

## L-13 — Double refund protection

| Field | Content |
|-------|---------|
| **Goal** | Prove second **full** refund event (duplicate `charge.refunded` or duplicate refund id) does not corrupt state, duplicate incidents, or trigger fulfillment. |
| **Safe test method** | After L-11 full refund recorded, **resend** same `charge.refunded` from Dashboard **or** post second signed fixture with same event id / new event id per test plan — **after approval**. |
| **Expected DB / order state** | `postPaymentIncidentStatus` remains **REFUNDED**; audit/incident rows idempotent; fulfillment count unchanged. |
| **Pass criteria** | Before/after enums equal; `assessPhase1RefundOperatorChecklist` denies duplicate manual refund review (`already_recorded_refunded_incident`). |
| **Evidence to capture** | Before/after incident enums; note duplicate delivery class (Dashboard resend vs new evt). |
| **Risks** | Stripe partial+full sequence mistaken for double full — run only after L-11 stable. |
| **Stripe manual action required?** | **Yes** — resend or second refund event in test mode. |

**Approval gate:** `Approved: L-13 double refund protection proof on staging`

---

## Suggested Day 2 order

| Order | Level | Rationale |
|-------|-------|-----------|
| 1 | **P-1 / P-2** | Unblock CI and operator reads |
| 2 | **L-10** | Partly automated; low new Stripe surface |
| 3 | **L-9** | Abandon path; no refund |
| 4 | **L-8** | Decline; still pre-PAID |
| 5 | **L-11** | Full refund mirror |
| 6 | **L-12** | Partial refund |
| 7 | **L-13** | Duplicate refund delivery |

---

## Evidence outputs (Day 2)

For each completed L, add sanitized row to:

- `Ap786/AP786_ALL_PASSES_INVESTOR_PROOF.md` (summary table)  
- Optional per-level `Ap786/L8_…md` files when runs complete  
- Update `AP786_EVIDENCE_INDEX.txt`

---

## What Day 2 does not claim

- Production launch readiness  
- Live Stripe behavior  
- Chargeback/dispute full matrix (partially touched in chaos tests only)  
- Regulatory or finance sign-off  

See `DAY1_REMAINING_RISKS.md` for carryover risks.
