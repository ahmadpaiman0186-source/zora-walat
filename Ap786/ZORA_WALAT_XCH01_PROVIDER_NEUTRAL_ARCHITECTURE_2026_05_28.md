# XCH-01 Provider-Neutral Architecture

**Date:** 2026-05-28
**Status:** **DESIGN ONLY / NO PROVIDER INTEGRATED**

---

## 1. Purpose

Define **provider-neutral abstractions** so future FX, payout, compliance, and reconciliation vendors can be swapped without rewriting core transaction lifecycle logic.

No vendor is selected, integrated, or certified by this document.

---

## 2. Abstraction layers

| Layer | Responsibility | Implementation status |
|-------|----------------|----------------------|
| **FX provider port** | Rate fetch, rate lock, trade instruction (future) | **NOT INTEGRATED** |
| **Payout provider port** | Beneficiary validation, payout submit, status poll | **NOT INTEGRATED** |
| **KYC/KYB provider port** | Identity verification, document OCR, liveness | **NOT INTEGRATED** |
| **AML/sanctions port** | Screening, monitoring alerts, list updates | **NOT INTEGRATED** |
| **Reconciliation port** | Partner file ingest, exception matching | **NOT INTEGRATED** |

---

## 3. FX provider abstraction

| Capability | Interface contract (conceptual) | Notes |
|------------|--------------------------------|-------|
| `getRate(corridor, pair)` | Returns reference rate + timestamp | Sandbox mock only until approved |
| `lockRate(quoteId)` | Returns lock token + expiry | No live execution |
| `executeTrade(lockToken)` | Future gated; **BLOCKED** | Requires license + gate |

---

## 4. Payout provider abstraction

| Capability | Interface contract (conceptual) | Notes |
|------------|--------------------------------|-------|
| `validateBeneficiary(profile)` | Match verified receiver | Hard fail on mismatch |
| `submitPayout(instruction)` | Idempotent payout request | **BLOCKED** |
| `getPayoutStatus(payoutId)` | Poll partner status | Read-only in future sandbox |

---

## 5. KYC/KYB provider abstraction

| Capability | Interface contract (conceptual) | Notes |
|------------|--------------------------------|-------|
| `verifyIndividual(senderId)` | KYC result + risk tier | **NOT INTEGRATED** |
| `verifyBusiness(businessId)` | KYB + UBO | **NOT INTEGRATED** |
| `refreshVerification(entityId)` | Periodic re-KYC | Future policy |

---

## 6. AML/sanctions provider abstraction

| Capability | Interface contract (conceptual) | Notes |
|------------|--------------------------------|-------|
| `screenParty(partyId)` | Sanctions/PEP result | Hard stop on match |
| `monitorTransaction(txnId)` | Post-send alert | **NOT INTEGRATED** |
| `createCase(alertId)` | Ops workflow handoff | Design only |

---

## 7. Reconciliation provider abstraction

| Capability | Interface contract (conceptual) | Notes |
|------------|--------------------------------|-------|
| `ingestSettlementFile(partner, date)` | Parse partner report | Future sandbox |
| `matchToLedger(entries)` | Exception queue | No auto-write-off |

---

## 8. Failover and provider degradation

| Scenario | Model | Status |
|----------|-------|--------|
| FX provider timeout | Fail closed; do not quote | **DESIGN ONLY** |
| Payout provider down | Hold funds; no alternate silent rail | **DESIGN ONLY** |
| KYC provider degraded | Block new sends | **DESIGN ONLY** |
| Sanctions provider unavailable | **Hard stop** — no send | **DESIGN ONLY** |
| Secondary provider | Manual gate + config change only | **NOT AUTO-SWITCH** without approval |

---

## 9. Conservative verdict

| Item | Status |
|------|--------|
| Provider-neutral design documented | **YES** |
| Any provider integrated | **NO** |
| Production payout/FX | **NO-GO** |

---

*XCH-01 provider architecture — specification only*
