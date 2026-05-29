# CORE-09 Pilot Entry Criteria

**Date:** 2026-05-29  
**Status:** **ALL CRITERIA PENDING** — pilot **NOT APPROVED**

---

## 1. Gate rule

**All** sections below must be **PASS / ACCEPTED** before any controlled pilot **execution** consideration (separate from CORE-09 gate-review phrase). Partial evidence → **NO-GO**.

---

## 2. Super-System kernel evidence (required)

| ID | Criterion | Source track | Minimum proof | Status |
|----|-----------|--------------|---------------|--------|
| E-CORE4 | Runtime Doctor local proof | CORE-04 | `npm run test:runtime-doctor` PASS + evidence doc filed | **PENDING** |
| E-CORE5 | Duplicate / idempotency proof | CORE-05 | `npm run test:idempotency-kernel` PASS | **PENDING** |
| E-CORE6 | No-pay-no-service proof | CORE-06 | `npm run test:no-pay-no-service` PASS | **PENDING** |
| E-CORE7 | Sandbox provider drill evidence | CORE-07 | CORE7-EV-* **ACCEPTED** only if drill separately approved **and** executed | **PENDING / N/A** |
| E-CORE8 | Safe repair dry-run proof | CORE-08 | `npm run test:safe-repair-dry-run` PASS; apply **NOT ENABLED** | **PENDING** |

**Note:** Local unit tests **do not** prove production behavior.

---

## 3. Money-path evidence (required)

| ID | Criterion | Status |
|----|-----------|--------|
| E-PAY | Payment path proof (Stripe **test** or approved staging — not live by default) | **PENDING** |
| E-WH | Webhook delivery, signature, idempotency proof | **PENDING** |
| E-CHK | Checkout happy / decline / cancel paths | **PENDING** |
| E-NPNS | No-pay-no-service negative tests (staging or approved harness) | **PENDING** |

---

## 4. Provider evidence (required)

| ID | Criterion | Status |
|----|-----------|--------|
| E-PROV | Provider catalog + corridor availability verified | **PENDING** |
| E-SBX | Sandbox vs live boundary documented and confirmed for pilot env | **PENDING** |
| E-DUP-PRV | Duplicate provider reference prevention evidence | **PENDING** |

---

## 5. Operations evidence (required)

| ID | Criterion | Status |
|----|-----------|--------|
| E-OBS | Observability proof (logs, metrics, alerts for money path) | **PENDING** |
| E-SUP | [Support readiness](./ZORA_WALAT_CORE09_SUPPORT_AND_OPERATOR_READINESS_2026_05_29.md) | **PENDING** |
| E-IR | [Incident response readiness](./ZORA_WALAT_CORE09_INCIDENT_RESPONSE_AND_ABORT_PLAN_2026_05_29.md) | **PENDING** |
| E-ROLL | Rollback / abort plan signed | **PENDING** |
| E-STAKE | Stakeholder approval (program + engineering + ops) | **PENDING** |

---

## 6. Approval prerequisites

| Step | Requirement |
|------|-------------|
| 1 | Complete [Evidence checklist](./ZORA_WALAT_CORE09_PILOT_EVIDENCE_CHECKLIST_2026_05_29.md) |
| 2 | [Exposure limits](./ZORA_WALAT_CORE09_PILOT_EXPOSURE_LIMITS_2026_05_29.md) acknowledged |
| 3 | Phrase `APPROVE CORE-09 CONTROLLED PILOT GATE ONLY` on file (gate review) |
| 4 | **Separate** pilot execution DR (future) — **not** CORE-09 alone |
| 5 | **CORE-11** real-money go/no-go (future) — **required** before real-money |

---

## 7. Default outcome

| Item | Default |
|------|---------|
| Entry criteria met | **NO** |
| Controlled pilot | **NOT APPROVED** |
| Controlled pilot executed | **NO** |

---

*End of entry criteria.*
