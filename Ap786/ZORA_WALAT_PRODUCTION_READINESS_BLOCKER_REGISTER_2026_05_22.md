# Zora-Walat — Production Readiness Blocker Register

**Date:** 2026-05-22
**Go/No-Go pack:** [ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md](./ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md)
**Gate 1 execution:** [ZORA_WALAT_GATE1_BLOCKER_TO_OWNER_MATRIX_2026_05_22.md](./ZORA_WALAT_GATE1_BLOCKER_TO_OWNER_MATRIX_2026_05_22.md)
**Gate 3 observability:** [ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md](./ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md)
**Gate 4 security:** [ZORA_WALAT_GATE4_SECURITY_BLOCKER_REGISTER_2026_05_22.md](./ZORA_WALAT_GATE4_SECURITY_BLOCKER_REGISTER_2026_05_22.md)
**Stripe webhook failure:** [ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_BLOCKER_REGISTER_2026_05_22.md](./ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_BLOCKER_REGISTER_2026_05_22.md) · [read-only evidence scaffold](./evidence/stripe-webhook-failure-2026-05-22/README.md) · [remediation plan 2026-05-23](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md) (**PLAN ONLY**) · [implementation approval gate 2026-05-23](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md) (**PENDING**)
**Default verdict:** **NO-GO** until critical blockers **closed**

---

## 1. Purpose

Single register of **open blockers** preventing production and real-money launch, with owners (placeholders), evidence requirements, exit criteria, and burn-down phases.

---

## 2. Blocker summary

| Severity | Open count | Launch impact |
|----------|------------|---------------|
| **Critical** | 6 | **NO-GO** |
| **High** | 5 | **NO-GO** until closed or waived with board risk record |
| **Medium** | 4 | Diligence / partial launch prep only |

---

## 3. Master blocker table

| Blocker ID | Domain | Description | Current status | Risk | Why it blocks production | Required evidence | Required approval | Target phase | Exit criteria |
|------------|--------|-------------|----------------|------|------------------------|-------------------|-------------------|--------------|---------------|
| **BL-C01** | Governance | Stakeholder sign-off **PENDING** | **PENDING** | Critical | No authorized program GO | `SIGN-APPR-*` filed | Program + roles T-01…T-07 | Q0 | Tracker not PENDING |
| **BL-C02** | Launch | Production-ready **NOT READY** | **BLOCKED** | Critical | Launch forbidden | Gates 1–12 MET | Board + CTO | Q2+ | GO record |
| **BL-C03** | Money | Real-money **NOT READY** | **BLOCKED** | Critical | Live Stripe forbidden | G-04 cert pack | CTO + payments | Q2+ | G-04 evidence |
| **BL-C04** | Money | L-13 duplicate refund **BLOCKED** | **BLOCKED** | Critical | Duplicate refund gap | L13 PASS doc | G-02 + payments | Q1 | L-13 executed |
| **BL-C05** | Ops | Prod observability **NOT PROVEN** | **PENDING EVIDENCE** | Critical | Blind prod incidents | OBS manifest rows | SRE + OBS-G | Q1 | OBS-DASH/ALERT/SYN filed |
| **BL-C06** | Safety | Default **NO-GO** not overridden | **COMPLETE** | Critical | Prevents silent launch | Gate pack ack | — | Now | Decision record GO only |
| **BL-H01** | QA | QA PASS **NOT CLAIMED** | **PENDING** | High | False quality claim | SIGN-QA-*; manual QA | QA lead | Q0 | QA sign-off scoped |
| **BL-H02** | Money | L-12 partial refund **NOT PROVEN** | **PENDING** | High | Refund semantics | L12 PASS doc | G-03 | Q1 | L-12 executed |
| **BL-H03** | Security | Credential rotation execute **BLOCKED** | **BLOCKED** | High | Compromised cred risk | G-01 evidence | Security + ops | Q1 | Rotation verified |
| **BL-H04** | Money | Global money-path **PARTIAL** | **PARTIAL** | High | Live path unproven | Prod monitors + G-04 | Payments | Q1–Q2 | Prod money proof |
| **BL-H05** | Ops | Rollback drills **PENDING** | **PENDING EVIDENCE** | High | Cannot safe rollback | OBS-RB-* | SRE | Q1 | Drills filed |
| **BL-M01** | QA | Manual a11y **PENDING** | **PENDING** | Medium | a11y liability | SIGN-A11Y-* | UX + QA | Q0 | Smoke filed |
| **BL-M02** | Ops | Neon/Vercel operator confirm | **BLOCKED** | Medium | Wrong env risk | Operator checklist | Ops | Q1 | Dashboard confirm |
| **BL-M03** | Legal | Compliance review **NOT STARTED** | **NOT STARTED** | Medium | Market claim risk | Counsel sign-off | Legal | Q1+ | External memo |
| **BL-M04** | NPS | Prod gate denial metrics | **PENDING EVIDENCE** | Medium | Unpaid fulfill detect | OBS-NPS-GATE-001 | SRE | Q1 | Alert live |

---

## 4. Critical blockers (detail)

| ID | Summary | Exit criteria |
|----|---------|---------------|
| BL-C01 | No filed stakeholder signatures | All required `SIGN-APPR-*` + template signed |
| BL-C02 | Program **NOT READY** for prod | All gates MET + checklist |
| BL-C03 | Live-money blocked | G-04 complete |
| BL-C04 | L-13 not executed | Ap786 L-13 PASS |
| BL-C05 | No prod OBS proof | OBS manifest minimum set |
| BL-C06 | **NO-GO** default (policy) | Explicit GO record only |

---

## 5. High-risk blockers

See master table BL-H01 … BL-H05.

---

## 6. Medium-risk blockers

See master table BL-M01 … BL-M04.

---

## 7. Stakeholder blockers

| ID | Status | Owner placeholder |
|----|--------|-------------------|
| BL-C01 | **PENDING** | _Program lead_ |

---

## 8. QA blockers

| ID | Status | Owner placeholder |
|----|--------|-------------------|
| BL-H01 | **NOT CLAIMED** | _QA lead_ |
| BL-M01 | **PENDING** | _UX / QA_ |

---

## 9. Observability blockers

| ID | Status | Owner placeholder |
|----|--------|-------------------|
| BL-C05 | **NOT PROVEN** | _SRE lead_ |

---

## 10. Security / credential blockers

| ID | Status | Owner placeholder |
|----|--------|-------------------|
| BL-H03 | **BLOCKED** | _Security lead_ |

---

## 11. Money-path blockers

| ID | Status | Owner placeholder |
|----|--------|-------------------|
| BL-C03 | **BLOCKED** | _Payments owner_ |
| BL-C04 | **BLOCKED** | _Payments owner_ |
| BL-H02 | **PENDING** | _Payments owner_ |
| BL-H04 | **PARTIAL** | _Payments + engineering_ |
| STRIPE-WH-001 | **FAILED / PENDING INVESTIGATION** | _Payments + engineering_ — remediation **PLAN FILED**; [implementation approval](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md) **PENDING**; fix **NOT EXECUTED** |
| **G-02-WH-STG** | **PARTIAL / NOT FULLY PROVEN** | _Payments + engineering_ — STR-02 original result **404**; PR #72 bridge **MERGED**; static route verifier **PASS**; PR72 deployed route evidence **PARTIAL DEPLOYMENT EVIDENCE CAPTURED**; invalid-signature `/webhooks/stripe` HTTP proof returned `400` (**route reachability PROVEN PARTIAL**); STR-03 controlled sandbox screenshots **INGESTED** with Stripe-side trigger/delivery proof **PARTIAL PROOF CAPTURED** and delivery result **HTTP 200 OK CAPTURED**, but Vercel visible runtime receipt, event ID correlation, idempotency/lifecycle, and fast ACK logs remain **NOT FOUND / INCONCLUSIVE**; STR-04 runtime correlation gap investigation **FILED**; STR-05 source review **FILED**; STR-07 deployment readiness scaffold **FILED**; STR-08 synthetic invalid-signature staging probe **EXECUTED ONCE** and returned HTTP `400`, with Vercel observability marker captures ingested as **NOT FOUND / NO LOGS FOUND**; STR-09 Stripe email says test-mode delivery resumed for staging `/webhooks/stripe`, but this is Stripe-side email evidence only; STR-10 decision gate **FILED**; STR-11 durable non-money audit approval pack **FILED**; STR-12 durable non-money audit **MERGED (PR #87)**; STR-12 merge-readiness evidence **MERGED (PR #89)**; post-STR-12 staging runtime proof **PENDING** ([STR-13 scaffold](./ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md) **MERGED PR #90**); STR-14 execution gate [filed](./ZORA_WALAT_STR14_RUNTIME_PROOF_EXECUTION_APPROVAL_GATE_2026_05_27.md) — **NOT EXECUTED**; full processing **NOT FULLY PROVEN**; production/real-money **NO-GO** |
| **STR12-PR87-VERCEL-RL-001** | **CLOSED / HISTORICAL** | _Engineering + ops_ — external Vercel rate limit blocked PR **#87** merge; PR **#87** later merged; [evidence](./evidence/str12-pr87-vercel-rate-limit-blocker-2026-05-27/README.md) |
| **STR13-POST-MERGE-RT-001** | **PENDING EVIDENCE** | _Engineering + ops_ — STR-13 scaffold merged (PR **#90**); STR13-001..008 **PENDING CAPTURE**; merge ≠ runtime proof |
| **STR14-EXEC-GATE-001** | **PENDING APPROVAL** | _Engineering + ops_ — STR-14 execution gate merged (PR **#91**); STR14-C01..C09 **PENDING APPROVAL / PENDING CAPTURE**; execution **NOT AUTHORIZED**; [gate](./ZORA_WALAT_STR14_RUNTIME_PROOF_EXECUTION_APPROVAL_GATE_2026_05_27.md) |
| **XCH00-FUTURE-REMIT-001** | **BLOCKED / FUTURE ONLY** | _Program + compliance_ — XCH-00 strategy architecture **MERGED (PR #92)**; money transmission **NOT ENABLED**; licensing **NOT OBTAINED**; [pack](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) |
| **XCH01-INFRA-GATE-001** | **BLOCKED / PLANNING ONLY** | _Program + engineering + compliance_ — XCH-01 **MERGED (PR #93)**; infrastructure specs **NOT EXECUTED**; [gate](./ZORA_WALAT_XCH01_EXCHANGE_INFRASTRUCTURE_EXECUTION_GATE_2026_05_28.md) |
| **XCH02-CONTRACTS-001** | **BLOCKED / SPEC ONLY** | _Program + engineering_ — XCH-02 **MERGED (PR #94)**; provider-neutral interface contracts; adapters **NOT IMPLEMENTED**; XCH2-G1..G5 **BLOCKED**; [contracts](./ZORA_WALAT_XCH02_PROVIDER_NEUTRAL_INTERFACE_CONTRACTS_2026_05_28.md) |
| **XCH03-QUOTE-ENGINE-001** | **BLOCKED / SPEC ONLY** | _Program + engineering + legal_ — XCH-03 **MERGED (PR #95)**; quote/rate/fee/tax execution spec; runtime engine **NOT IMPLEMENTED**; tax calculation **NO-GO**; XCH3-G1..G4 **BLOCKED**; [spec](./ZORA_WALAT_XCH03_QUOTE_RATE_FEE_TAX_ENGINE_EXECUTION_SPEC_2026_05_28.md) |
| **XCH04-LEDGER-SETTLEMENT-001** | **BLOCKED / SPEC FILED ONLY** | _Program + engineering + finance + compliance_ — XCH-04 **MERGED (PR #96)**; ledger, settlement, reconciliation, duplicate-prevention, reversal, and audit invariants documented; no runtime implementation, DB schema, migration, provider integration, payout, wallet mutation, settlement execution, or production evidence; XCH4-G1..G5 **BLOCKED**; [invariants](./ZORA_WALAT_XCH04_LEDGER_SETTLEMENT_RECONCILIATION_INVARIANTS_2026_05_28.md) |
| **XCH05-COMPLIANCE-CORRIDOR-001** | **BLOCKED / SPEC FILED ONLY** | _Program + legal + compliance + engineering_ — XCH-05 compliance, corridor, KYC/KYB, AML/sanctions, transaction monitoring, manual review, privacy, and launch gates documented; no legal/compliance approval, provider integration, runtime implementation, production data processing, real-money transaction, payout, or corridor launch evidence; XCH5-G1..G5 **BLOCKED**; [gate matrix](./ZORA_WALAT_XCH05_COMPLIANCE_CORRIDOR_KYC_AML_GATE_MATRIX_2026_05_28.md) |
| **XCH06-SANDBOX-SIMULATION-001** | **BLOCKED / SPEC FILED ONLY** | _Program + engineering + compliance_ — XCH-06 **MERGED**; sandbox-only non-money simulation boundaries documented; no runtime implementation, fake provider adapter, DB schema, migration, external provider integration, payment, payout, wallet mutation, settlement execution, or production evidence; XCH6-G1..G4 **BLOCKED**; [boundary](./ZORA_WALAT_XCH06_SANDBOX_ONLY_NON_MONEY_SIMULATION_BOUNDARY_2026_05_28.md) |
| **CARD00-DIGITAL-CARD-BANK-PARTNER-001** | **BLOCKED / ARCHITECTURE FILED ONLY** | _Program + legal + compliance + banking_ — CARD-00 **MERGED**; cross-border digital card architecture documented; CARD0-G1..G8 **BLOCKED**; [architecture](./ZORA_WALAT_CARD00_DIGITAL_CARD_BANK_PARTNER_ARCHITECTURE_2026_05_28.md) |
| **AFGCARD00-DOMESTIC-WALLET-CARD-001** | **BLOCKED / ARCHITECTURE FILED ONLY** | _Program + legal + compliance + banking_ — AFG-CARD-00 **MERGED**; Afghanistan domestic wallet/card architecture; **domestic-only — excludes cross-border remittance**; [architecture](./ZORA_WALAT_AFG_CARD00_DOMESTIC_DIGITAL_WALLET_CARD_ARCHITECTURE_2026_05_28.md) |
| **AFGCARD01-DUE-DILIGENCE-001** | **BLOCKED / DUE DILIGENCE FILED ONLY** | _Program + legal + compliance + banking + ops_ — AFG-CARD-01 **MERGED**; DD requirements documented; [DD matrix](./ZORA_WALAT_AFG_CARD01_BANK_SWITCH_BILLER_TELECOM_DUE_DILIGENCE_MATRIX_2026_05_28.md) |
| **AFGCARD02-PARKED-ACTIVATION-GATE-001** | **PARKED / ACTIVATION REQUIRED** | _Program + legal + compliance + engineering_ — AFG-CARD-02 **MERGED**; track parked; [parking gate](./ZORA_WALAT_AFG_CARD02_PARKING_AND_ACTIVATION_GATE_2026_05_28.md) |
| **CORE01-PROVIDER-CATALOG-READINESS-001** | **BLOCKED / READINESS REVIEW FILED ONLY** | _Program + engineering + ops_ — provider catalog, Reloadly/provider dependency, top-up, data package, international call boundary, checkout/order dependency, fail-closed reliability, and evidence requirements documented via read-only repo inspection; no provider API execution, catalog sync, purchase, payment mutation, order mutation, sandbox proof, pilot approval, or production evidence; [readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md) |
| **CORE02-PROVIDER-SANDBOX-BOUNDARY-001** | **BLOCKED / GOVERNANCE PACK FILED ONLY** | _Program + engineering + ops_ — CORE-02 sandbox vs real Reloadly boundary, provider catalog evidence matrix (CORE2-EV-* **PENDING**), no-pay-no-service provider failure rules, top-up/data/call readiness gates, risk register, decision template; **no** provider API execution, sandbox drill, catalog sync, payment/order mutation, or production/pilot/real-money evidence; prod/real-money/controlled pilot/market launch **NO-GO**; [master boundary](./ZORA_WALAT_CORE02_PROVIDER_CATALOG_RELOADLY_SANDBOX_BOUNDARY_2026_05_29.md) |
| **CORE03-RELIABILITY-KERNEL-001** | **BLOCKED / ARCHITECTURE FILED ONLY** | _Program + engineering + SRE_ — CORE-03 Super-System reliability kernel: hard invariants INV-01..07, failure modes FM-01..15, payment/order/provider state machine source review, no-duplicate and no-pay-no-service control models, auto-detection matrix, failover/retry boundaries, self-repair classes A–D (**apply NOT ENABLED**); read-only source review only; duplicate provider prevention and no-pay-no-service enforcement **NOT VERIFIED**; [kernel](./ZORA_WALAT_CORE03_SUPER_SYSTEM_RELIABILITY_KERNEL_2026_05_29.md) |
| **CORE04-RUNTIME-DOCTOR-001** | **IMPLEMENTED DETECT-ONLY / NOT PRODUCTION-PROVEN** | _Engineering + SRE_ — CORE-04 detect-only runtime doctor (`server/src/reliability/runtimeDoctor/`); eight pure scanners; fixture-only `zw-doctor reliability --fixture`; `npm run test:runtime-doctor`; **no** DB write, external API, payment/order/wallet/provider mutation, or auto-repair apply; runtime proof **local unit tests only**; production/pilot/real-money/market launch **NO-GO**; [doctor](./ZORA_WALAT_CORE04_DETECT_ONLY_RUNTIME_DOCTOR_2026_05_29.md) |
| **CORE05-IDEMPOTENCY-KERNEL-001** | **IMPLEMENTED CLASSIFY-ONLY / NOT WIRED / NOT PRODUCTION-PROVEN** | _Engineering + SRE_ — CORE-05 duplicate transaction + idempotency control kernel (`server/src/reliability/idempotencyKernel/`); canonical key model; classify-only decisions; **not** wired into live checkout/webhook/provider paths; `npm run test:idempotency-kernel`; **no** live duplicate prevention claim; **no** DB write, external API, payment/order/wallet/provider mutation, or auto-repair apply; proof **local unit tests only**; production/pilot/real-money/market launch **NO-GO**; [kernel](./ZORA_WALAT_CORE05_DUPLICATE_TRANSACTION_IDEMPOTENCY_KERNEL_2026_05_29.md) |
| **CORE06-NPNS-RUNTIME-PROOF-001** | **IMPLEMENTED CLASSIFY-ONLY / NOT WIRED / NOT PRODUCTION-PROVEN** | _Engineering + SRE_ — CORE-06 no-pay-no-service runtime proof (`server/src/reliability/noPayNoServiceProof/`); payment/provider/order/audit/idempotency proof bundles; delivery decision engine; optional doctor export **not wired**; `npm run test:no-pay-no-service`; **no** live no-pay-no-service claim; **no** DB write, external API, payment/order/wallet/provider mutation, or auto-repair apply; proof **local unit tests only**; production/pilot/real-money/market launch **NO-GO**; [proof](./ZORA_WALAT_CORE06_NO_PAY_NO_SERVICE_RUNTIME_PROOF_2026_05_29.md) |
| **CORE07-PROVIDER-SANDBOX-DRILL-001** | **BLOCKED / GATE FILED ONLY** | _Program + engineering + ops_ — CORE-07 provider sandbox drill gate, runbook, sandbox checklist, CORE7-EV-001..019 evidence matrix, NPNS/duplicate drill guardrails, abort/stop conditions, CORE7-DR template; **Ap786 docs only**; **no** sandbox drill executed; **no** provider API call; phrase `APPROVE CORE-07 RELOADLY SANDBOX DRILL ONLY` required for future drill; provider proof **NOT VERIFIED**; production/pilot/real-money/market launch **NO-GO**; [gate](./ZORA_WALAT_CORE07_PROVIDER_SANDBOX_DRILL_GATE_2026_05_29.md) |
| **CORE08-SAFE-REPAIR-DRY-RUN-001** | **IMPLEMENTED DRY-RUN ONLY / APPLY NOT ENABLED** | _Engineering + SRE_ — CORE-08 safe repair dry-run engine (`server/src/reliability/safeRepairDryRun/`); consumes CORE-04/05/06 signals; repair classes A–D; `npm run test:safe-repair-dry-run`; zw-doctor `repair-dry-run --fixture`; `--apply` forbidden; **no** repair apply, DB write, external API, provider retry, refund, or wallet/order/payment mutation; proof **local unit tests only**; production/pilot/real-money/market launch **NO-GO**; [engine](./ZORA_WALAT_CORE08_SAFE_REPAIR_DRY_RUN_ENGINE_2026_05_29.md) |
| **CORE09-CONTROLLED-PILOT-001** | **BLOCKED / GATE FILED ONLY** | _Program + engineering + ops + compliance_ — CORE-09 controlled pilot gate: entry/exit criteria, exposure limits, CORE9-EV evidence checklist, incident/abort plan, support/operator readiness, CORE9-DR template; phrase `APPROVE CORE-09 CONTROLLED PILOT GATE ONLY` (gate review only); real-money requires separate CORE-11; **Ap786 only**; controlled pilot **NOT APPROVED NOT EXECUTED**; **no** provider execution, payment/order/wallet mutation, DB write, external API, or auto-repair apply; production/pilot/real-money/market launch **NO-GO**; [gate](./ZORA_WALAT_CORE09_CONTROLLED_PILOT_GATE_2026_05_29.md) |
| **CORE10-STAGING-DOCTOR-OBS-001** | **BLOCKED / L-12 TOKEN REFRESH BLOCKED** | _Engineering + SRE + ops_ — L-10 API **CORRECTED**; [L-12 evidence](./ZORA_WALAT_L12_CORE10_TOKEN_REFRESH_RETRY_EVIDENCE_2026_05_30.md): login **BLOCKED_CREDS_MISSING** (`STAGING_OPERATOR_PASSWORD` absent); stale expired token; status-check **SKIPPED**; **CORE10-BLK-CAPTURE-001** **OPEN**; full snapshot **NOT EXECUTED**; doctor/obs **NOT VERIFIED**; production/pilot/real-money/market **NO-GO** |
| **CORE11-REAL-MONEY-GONOGO-001** | **BLOCKED / GATE FILED ONLY** | _Program + engineering + finance + compliance + ops_ — CORE-11 real-money go/no-go gate; CORE11-EV proof matrix; go/no-go criteria; risk register; financial control; compliance/security; ops readiness; phrase `APPROVE CORE-11 REAL-MONEY GO-NO-GO GATE ONLY` (review only, **not** execution); real-money **NOT APPROVED NOT EXECUTED**; controlled pilot **NOT APPROVED** by CORE-11; **Ap786 only**; **no** provider/payment/wallet mutation, DB write, deploy, or auto-repair apply; production/pilot/real-money/market launch **NO-GO**; [gate](./ZORA_WALAT_CORE11_REAL_MONEY_GO_NO_GO_DECISION_GATE_2026_05_29.md) |
| **CORE12-CORE-EVIDENCE-RECON-001** | **OPEN / RECONCILIATION FILED** | _Program + engineering + ops + compliance_ — CORE-12 final evidence reconciliation for CORE-01..11; proof tiers DOCS_ONLY vs LOCAL_FIXTURE vs STAGING vs LIVE; market readiness gap register CORE12-GAP-* **OPEN**; RM-BLK real-money map; PWOW domain gap matrix; Super-System intelligence review **NOT PRODUCTION READY**; **Ap786 only**; does **not** approve execution, pilot, real-money, or market launch; CORE-07/09/10/11 remain gates filed only unless separate execution evidence; production/pilot/real-money/market launch **NO-GO**; [reconciliation](./ZORA_WALAT_CORE12_FINAL_CORE_EVIDENCE_RECONCILIATION_2026_05_29.md) · [verdict](./ZORA_WALAT_CORE12_CONSERVATIVE_VERDICT_2026_05_29.md) |
| **CORE00-RETURN-TO-CORE-001** | **BLOCKED / EXECUTION GATE FILED ONLY** | _Program + engineering + ops_ — core top-up, data, international call, provider reliability, checkout/webhook, order safety, receipt, support, and controlled pilot gates documented; no runtime implementation, provider execution, payment mutation, order mutation, sandbox proof, pilot approval, or production evidence; CORE0-G1..G4 **BLOCKED**; [execution gate](./ZORA_WALAT_CORE00_RETURN_TO_CORE_EXECUTION_GATE_2026_05_28.md) |

---

## 12. L-12 / L-13 blockers

| Proof | Status | Gate |
|-------|--------|------|
| L-12 | **PENDING / NOT PROVEN** | G-03 |
| L-13 | **PENDING / BLOCKED** | G-02 |

---

## 13. Rollback blockers

| ID | Status |
|----|--------|
| BL-H05 | **PENDING EVIDENCE** |

---

## 14. Legal / compliance placeholders

| ID | Status |
|----|--------|
| BL-M03 | **NOT STARTED** |

---

## 15. Dependency map

```text
BL-C01 (sign-off) ──┬──► BL-C02 (prod ready)
BL-C05 (OBS) ───────┤
BL-H01 (QA) ────────┤
BL-C04 (L-13) ──────┼──► BL-C03 (live-money) ──► BL-C02
BL-H03 (creds) ─────┘
BL-H05 (rollback) ──► Gate 10 deploy
G-10 (self-heal) ─── independent — default OFF
```

---

## 16. Owner placeholder

| Domain | Owner role (assign human) |
|--------|---------------------------|
| Governance | _Program lead_ |
| QA | _QA lead_ |
| OBS / SRE | _SRE lead_ |
| Security | _Security lead_ |
| Payments | _Payments safety owner_ |
| Legal | _Counsel_ |

**Do not** fill names in repo until humans authorize.

---

## 17. Required evidence (by phase)

| Phase | Evidence |
|-------|----------|
| Q0 | SIGN-*, SIGN-QA-*, SIGN-A11Y-* |
| Q1 | OBS-*, OBS-RB-*, L-12/L-13 if approved |
| Q2 | G-04, GO decision record |

---

## 18. Exit criteria (program)

| Milestone | Criteria |
|-----------|----------|
| **Diligence only** | REVIEW-READY docs — **today** |
| **Gate prep** | Blockers → **READY FOR REVIEW** |
| **Conditional pilot** | BL-C01–C05 partial + board CONDITIONAL GO |
| **Production GO** | All BL-C* closed + GO record |

---

## 19. Blocker burn-down roadmap

| Week (proposed) | Focus | Blockers targeted |
|-----------------|-------|-------------------|
| 1 | Stakeholder + QA evidence | BL-C01, BL-H01, BL-M01 |
| 2–4 | OBS filing + drills | BL-C05, BL-H05 |
| 4–8 | L-12/L-13 planning (if approved) | BL-C04, BL-H02 |
| 8+ | Live-money cert (if approved) | BL-C03, BL-H04 |
| Launch | GO record only if all critical closed | BL-C02 |

---

*Production Readiness Blocker Register · default NO-GO · no fake clearance*
