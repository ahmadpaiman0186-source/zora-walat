# Zora-Walat — checkout.session.expired Webhook Timeout Remediation Plan

**Date:** 2026-05-23
**Scope:** **PLAN ONLY** — no code, deploy, env, API, webhook replay, DB, or payment mutation
**Evidence basis:** PR **#50** merged · [stripe-webhook-failure evidence folder](./evidence/stripe-webhook-failure-2026-05-22/README.md)
**Companion docs:**

| Document | Purpose |
|----------|---------|
| [FAST_ACK_ASYNC_PROCESSING_DESIGN](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_ASYNC_PROCESSING_DESIGN_2026_05_23.md) | Fast ACK + async processing architecture |
| [IDEMPOTENCY_HARDENING_PLAN](./ZORA_WALAT_STRIPE_WEBHOOK_IDEMPOTENCY_HARDENING_PLAN_2026_05_23.md) | Duplicate-event and money-path safety |
| [STAGING_REPLAY_TEST_PLAN](./ZORA_WALAT_STAGING_REPLAY_TEST_PLAN_2026_05_23.md) | Staging replay and regression tests |
| [PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN_2026_05_23.md) | Logs, alerts, dashboards, IR |
| [CONTROLLED_REAL_MONEY_PILOT_GATE](./ZORA_WALAT_CONTROLLED_REAL_MONEY_PILOT_GATE_2026_05_23.md) | Pilot gates before any live-money claim |

**Policy:** Conservative engineering evidence. **Do not** claim root cause confirmed, fix executed, or launch readiness.

---

## 1. Executive summary

Staging test-mode Stripe webhook deliveries for **`checkout.session.expired`** failed with **timeout** (May 19, 2026, 2:10:08 PM local, per filed dashboard captures). PR **#50** filed redacted Stripe failure screenshots and Vercel retention limitation evidence. **Vercel log correlation for the May 19 attempt window remains BLOCKED / INCONCLUSIVE** due to Hobby-tier 30-day retention limits.

This pack defines a **future** remediation path: fast ACK, durable receipt, async processing, idempotency hardening, observability evidence, staging replay proof, and controlled pilot gates — **without executing any of it today**.

| Dimension | Status |
|-----------|--------|
| Stripe timeout evidence | **FILED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT EXECUTED** |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Controlled pilot | **NO-GO** until gates pass |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 2. Evidence-based findings

### 2.1 What is filed (PR #50 / Ap786)

| Artifact | Proves | Does not prove |
|----------|--------|----------------|
| [STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png](./evidence/stripe-webhook-failure-2026-05-22/STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png) | Failed **`checkout.session.expired`** deliveries exist; **All delivery attempts have failed** visible | Root cause; handler bug class |
| [STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png](./evidence/stripe-webhook-failure-2026-05-22/STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png) | Failed delivery detail; endpoint **`/webhooks/stripe`** on **`zora-walat-api-staging`** | Origin HTTP status; Vercel invocation |
| [STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png](./evidence/stripe-webhook-failure-2026-05-22/STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png) | Stripe **timed out** / **Error insight** class | Signature vs timeout distinction at origin |
| [VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png](./evidence/stripe-webhook-failure-2026-05-22/VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png) | **30 days** retention / Observability Plus limitation | May 19 invocation rows |
| Endpoint overview + partial `charge.refunded` recovery PNGs | Endpoint active; **partial** event-type recovery | Global webhook health |

### 2.2 What is not confirmed

| Item | Status | Reason |
|------|--------|--------|
| Primary root cause (H1–H6) | **NOT CONFIRMED** | No May 19 Vercel window logs (RC-04/05) |
| Request reached application layer | **NOT PROVEN** | Current-window no-match only |
| Signature verification failure vs timeout | **NOT PROVEN** | Stripe shows timeout; no origin 401 evidence |
| Handler duration / cold start | **NOT PROVEN** | No correlated invocation metrics |
| Fix effectiveness | **NOT EXECUTED** | No code change in this task |
| Production webhook health | **NOT PROVEN** | Staging test-mode evidence only |

### 2.3 Why root cause cannot be claimed yet

Per [capture plan §8](./evidence/stripe-webhook-failure-2026-05-22/CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md):

1. **EC-02** (window-aligned Vercel logs) — **BLOCKED / INCONCLUSIVE** (retention).
2. **EC-03** (search variants VC-SV-01…05) — **PENDING** / blocked for historical window.
3. **EC-04** (classification CL-A…E assigned with artifacts) — **NOT ASSIGNED** as confirmed; **CL-E plausible** only.
4. **EC-05** (exactly one hypothesis CONFIRMED) — **NOT MET**.
5. Stripe timeout alone does **not** distinguish platform timeout, cold start, sync handler work, or no-request scenarios.

### 2.4 Why production / real-money / pilot remains NO-GO

| Gate | Blocker |
|------|---------|
| Money-path | STRIPE-WH-001, WH-003, WH-005, WH-006, BL-G4-P01 |
| Evidence | Root cause **NOT CONFIRMED**; fix **NOT EXECUTED** |
| Observability | Gate 3 **PENDING EVIDENCE**; May 19 correlation **INCONCLUSIVE** |
| Security | Gate 4 rotation **NOT EXECUTED** |
| Program | [Production Go/No-Go pack](./ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md) default **NO-GO** |

---

## 3. Hypothesis matrix (H1–H7)

| ID | Hypothesis | Evidence supporting | Evidence against | Missing proof | Required investigation | Risk to money path | Proposed mitigation (plan only) |
|----|------------|---------------------|------------------|---------------|------------------------|--------------------|---------------------------------|
| **H1** | Vercel **serverless function timeout** | Stripe **timed out**; slim path exists for `checkout.session.completed` but **`checkout.session.expired`** may use heavier path | Partial `charge.refunded` **200** recovery shows route can succeed | Invocation duration logs for May 19; per-event-type handler timing | Staging replay with structured latency logs; timeout regression tests | Missed expiry handling → stale checkout state; no-pay-no-service boundary stress | Fast ACK + async worker; cap sync work; [design doc](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_ASYNC_PROCESSING_DESIGN_2026_05_23.md) |
| **H2** | Route unavailable / **cold start** / deployment readiness | Known Day-1 cold-start history on webhook path ([DAY1_WEBHOOK_SLIM_PATH](./DAY1_WEBHOOK_SLIM_PATH.md)) | Endpoint **active**; other events recovered | Cold-start metrics at failure time; deploy SHA at May 19 | Correlate deploy timeline; synthetic warm-up policy | Delayed ack → Stripe retries; duplicate delivery risk | Warm route policy; fast ACK; deploy health gate before replay |
| **H3** | **Signature verification** or webhook secret/env mismatch | — (Stripe shows timeout, not 401) | Error insight suggests timeout not auth | Origin 401/403 logs; `signature_verified` false events | Signature unit tests; env parity checklist | Rejected webhooks → unpaid state; silent non-delivery | Verify signature first; fail fast 400; never block on business logic pre-ack |
| **H4** | Request **never reached application layer** | Vercel **no-match** in current window; CL-A plausible | Cannot prove for May 19 without RC-04 | May 19 `/webhooks/stripe` rows; edge routing proof | Window-aligned search post-retention upgrade or forward capture | Stripe retries; idempotency stress | Edge health checks; request-id logging at first middleware |
| **H5** | Handler **threw before structured logging** | — | — | Stack traces; `webhook_received` without follow-on events | Staging replay with fault injection | Unlogged failures → ops blind spot | Mandatory log sequence (§6); never swallow pre-ack errors |
| **H6** | **Synchronous heavy processing** blocked Stripe response | Architecture note: post-commit async intended for completed path | Expired path behavior not proven in logs | Code-path review for expired handler (Track H) | Trace expired handler wall-clock (approved code review) | Timeout → missed state transition | Move business work post-ack; outbox/worker |
| **H7** | **Observability retention gap** prevents historical proof | **30-day** retention PNG filed; May 19 > window on Hobby | — | Historical logs inherently unavailable | Observability Plus or export policy; forward capture SLO | False negative in RCA; repeat incidents | [Observability plan](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN_2026_05_23.md); extended retention before pilot |

**Rule:** At most **one** hypothesis may be marked **CONFIRMED** only after EC-01…EC-07 in capture plan — **not met today**.

---

## 4. Fix architecture plan (design only — not implemented)

See detailed design in companion documents. Summary:

| Layer | Planned behavior |
|-------|------------------|
| Ingress | `POST /webhooks/stripe` on staging/production |
| Verify | Stripe signature **immediately**; reject invalid with 400 |
| Persist | Raw event + metadata → durable store (outbox table / queue envelope) **before** business side effects |
| Ack | Return **2xx** only after validation + **durable receipt** |
| Process | Async worker / queue consumer for business logic |
| Idempotency | Stripe `event.id` + checkout session / order identity — [plan](./ZORA_WALAT_STRIPE_WEBHOOK_IDEMPOTENCY_HARDENING_PLAN_2026_05_23.md) |
| Retry | Stripe retries safe; duplicate events → `duplicate_event_blocked` |
| Money path | Zero duplicate transaction; **no-pay-no-service** fail-closed |
| Audit | Payment state transition trail; manual reconciliation with approval gate |
| Rollback | Feature flag / kill switch; revert deploy path documented |

**Forbidden in this phase:** implementing any row above without Track H approval.

---

## 5. Implementation branch plan (future — do not create now)

| Branch | Purpose | Depends on |
|--------|---------|------------|
| `feat/stripe-webhook-fast-ack-async-processing` | Fast ACK, outbox, async worker | Track H approval |
| `test/stripe-webhook-staging-replay-proof` | Staging replay + evidence PNGs | G-02 + explicit replay approval |
| `docs/stripe-webhook-observability-evidence` | Dashboard/log evidence filing | Gate 3 OBS rows |

**Merge policy:** No merge to production without staging replay PASS + observability evidence + pilot gate review.

---

## 6. Test plan summary (required before production claim)

| Test class | Required | Doc |
|------------|----------|-----|
| Local unit tests | Signature, idempotency, ack timing | [Staging replay plan §3](./ZORA_WALAT_STAGING_REPLAY_TEST_PLAN_2026_05_23.md) |
| Timeout regression | Handler completes ack < Stripe limit | Same |
| Duplicate-event | Same `event.id` twice → single effect | [Idempotency plan §4](./ZORA_WALAT_STRIPE_WEBHOOK_IDEMPOTENCY_HARDENING_PLAN_2026_05_23.md) |
| No duplicate wallet/order | Retry after timeout | Same |
| No-pay-no-service | Unpaid → no fulfill | Same |
| Staging webhook replay | **After explicit approval only** | Same §5 |
| Stripe test-mode evidence | Dashboard delivery 200 + logs | Same §6 |
| Vercel logs evidence | Structured field sequence | [Observability plan §3](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN_2026_05_23.md) |
| Rollback drill | Kill switch + revert | Observability plan §6 |

**Exit:** All rows **PASS** with filed Ap786 artifacts — **none filed today**.

---

## 7. Observability plan summary

Structured log lifecycle (implementation future):

`webhook_received` → `signature_verified` → `event_persisted` → `ack_returned` → `processing_started` → `processing_completed` | `processing_failed` | `duplicate_event_blocked` | `no_pay_no_service_blocked`

Full field definitions, alert thresholds, dashboard requirements, and IR checklist: [PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN_2026_05_23.md).

---

## 8. Controlled pilot gate summary

Pilot **NO-GO** until: stakeholder approval, credential/env approval, staging replay PASS, no-duplicate PASS, no-pay-no-service PASS, rollback ready, monitoring ready, amount/user limits, kill switch, daily review.

Full gate table: [CONTROLLED_REAL_MONEY_PILOT_GATE](./ZORA_WALAT_CONTROLLED_REAL_MONEY_PILOT_GATE_2026_05_23.md).

---

## 9. Phased remediation roadmap (plan only)

| Phase | Activity | Mode | Exit |
|-------|----------|------|------|
| **P0** | Evidence review (PR #50) | **COMPLETE** | Stripe PNGs filed |
| **P1** | This remediation pack | **COMPLETE** (this commit) | Docs filed |
| **P2** | Code design review + Track H approval | **PENDING** | Written approval |
| **P3** | Implement fast ACK + idempotency (feat branch) | **NOT STARTED** | CI green |
| **P4** | Staging replay + log evidence | **NOT STARTED** | Replay PASS filed |
| **P5** | Observability + alerts | **NOT STARTED** | Gate 3 rows |
| **P6** | Controlled pilot | **NOT STARTED** | Pilot gate PASS |
| **P7** | Production claim | **FORBIDDEN** until P0–P6 + board GO | Decision record |

---

## 10. Safety and forbidden operations

| Operation | Status |
|-----------|--------|
| Code / server / app changes | **NOT EXECUTED** |
| Deploy / env / credentials | **NOT EXECUTED** |
| Stripe / Vercel API or dashboard mutation | **NOT EXECUTED** |
| Webhook resend / replay | **NOT EXECUTED** |
| DB / payment / refund / wallet / order mutation | **NOT EXECUTED** |
| Production-ready or fixed claim | **FORBIDDEN** |

---

## 11. Conservative verdict

| Verdict | Value |
|---------|-------|
| Stripe timeout evidence | **FILED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT EXECUTED** |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Controlled pilot | **NO-GO** until gates pass |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Remediation plan · plan only · not production-ready · not a fix claim*

