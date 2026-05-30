# CORE-12 Market Readiness Gap Register

**Date:** 2026-05-29  
**Scope:** Ap786 only · reconciles CORE-01..11 · **not** production-ready · **not** market-launch-approved  

---

## 1. Register rules

- Each gap has ID `CORE12-GAP-###`, severity, proof tier required to close, and owning CORE track(s).
- **OPEN** = no acceptable evidence at required tier.
- Closing a gap requires evidence at tier **≥** `Required tier` — not documentation alone unless `Required tier` = `DOCS_ONLY` and acceptance criteria explicitly satisfied.

---

## 2. Market readiness domains

| Domain | Market-ready meaning (not claimed) | Current posture |
|--------|-----------------------------------|-----------------|
| Product (top-up / data / call) | Sellable core SKUs with provider proof | CORE-01 gaps OPEN; data Phase 1 disabled |
| Provider (Reloadly) | Sandbox + catalog evidence | CORE-07 drill **NOT EXECUTED** |
| Payment / webhook | Real-money safe checkout + webhook | Legacy staging partial; CORE-11 **NO-GO** |
| Order / fulfillment | Paid-only fulfillment invariant | Local NPNS tests only; live **NOT VERIFIED** |
| Wallet / ledger | No double-spend / duplicate settlement | Idempotency kernel **NOT wired** |
| Reliability / ops | Detect, observe, incident, rollback | CORE-04 local; CORE-10 **NOT EXECUTED** |
| Pilot / launch governance | Approved pilot or launch | CORE-09/11 gates filed only |

---

## 3. Gap register (priority ordered)

| ID | Gap | Severity | Required tier | Source track(s) | Status |
|----|-----|----------|---------------|-----------------|--------|
| CORE12-GAP-001 | End-to-end provider catalog + sandbox drill evidence | **CRITICAL** | `STAGING` (+ drill artifacts) | CORE-01, 02, 07 | **OPEN** |
| CORE12-GAP-002 | Live duplicate transaction prevention on checkout/webhook/Reloadly | **CRITICAL** | `LIVE` or approved pilot envelope | CORE-05, 03 | **OPEN** |
| CORE12-GAP-003 | Live no-pay-no-service enforcement on money path | **CRITICAL** | `LIVE` or approved pilot envelope | CORE-06, 03 | **OPEN** |
| CORE12-GAP-004 | Runtime doctor staging snapshot + observability correlation | **HIGH** | `STAGING` | CORE-10, 04 | **OPEN** |
| CORE12-GAP-005 | Controlled pilot approval + CORE9-EV checklist PASS | **CRITICAL** | `STAGING` + operator DR | CORE-09 | **OPEN** |
| CORE12-GAP-006 | Real-money go/no-go: CORE11-EV matrix PASS | **CRITICAL** | `LIVE` + compliance/finance sign-off | CORE-11 | **OPEN** |
| CORE12-GAP-007 | Top-up provider readiness (CORE1-EV / CORE2-EV) | **HIGH** | `STAGING` | CORE-01, 02 | **OPEN** |
| CORE12-GAP-008 | Data package provider path (Phase 1 disabled) | **MEDIUM** | `DOCS_ONLY` → `STAGING` when enabled | CORE-01 | **OPEN** |
| CORE12-GAP-009 | International call product boundary | **MEDIUM** | `DOCS_ONLY` | CORE-01 | **OPEN** |
| CORE12-GAP-010 | Safe repair apply path (Class C+) | **HIGH** | `STAGING` + explicit apply approval | CORE-08 | **BLOCKED** (apply disabled by design) |
| CORE12-GAP-011 | Production observability proof (APM, alerts, SLO) | **HIGH** | `LIVE` | Pre-CORE Gate-3 packs | **OPEN** |
| CORE12-GAP-012 | Stakeholder / Gate-1 sign-off for launch narrative | **HIGH** | `DOCS_ONLY` + signed DR | Investor/gate packs | **OPEN** |
| CORE12-GAP-013 | Idempotency + NPNS integration wiring | **CRITICAL** | `STAGING` then pilot | CORE-05, 06 | **OPEN** |
| CORE12-GAP-014 | Failover / retry load evidence | **HIGH** | `STAGING` | CORE-03 | **OPEN** |
| CORE12-GAP-015 | Market GTM / investor claim boundary vs runtime proof | **MEDIUM** | `DOCS_ONLY` alignment | CORE-12, investor packs | **PARTIAL** (boundaries documented; proof thin) |

---

## 4. Gap → evidence artifact map

| Gap ID | Evidence to file (examples) |
|--------|----------------------------|
| CORE12-GAP-001 | CORE7-EV-* PASS folder; CORE2-EV-SBX-* |
| CORE12-GAP-002 | CORE-05 integration boundary wired + pilot replay logs |
| CORE12-GAP-003 | CORE-06 wired + negative-path staging proofs |
| CORE12-GAP-004 | CORE10-EV-* after read-only staging capture |
| CORE12-GAP-005 | CORE9-DR APPROVED + CORE9-EV checklist |
| CORE12-GAP-006 | CORE11-DR + CORE11-EV-* + finance/compliance rows |
| CORE12-GAP-013 | Integration tests + staging webhook replay |

---

## 5. What would NOT close this register

| Activity | Closes gap? |
|----------|-------------|
| Filing CORE-12 docs | **NO** (meta only) |
| Local unit tests only | **NO** for GAP-002, 003, 006 |
| Gate review phrase without execution | **NO** for CORE-07, 09, 10, 11 |
| Investor screenshots without payment proof | **NO** for money-path gaps |
| zw-doctor propose-only summary | **NO** for live readiness |

---

## 6. Burn-down order (recommended, not approved)

1. CORE12-GAP-001 → CORE-07 drill (after phrase)  
2. CORE12-GAP-004 → CORE-10 staging capture (after phrases)  
3. CORE12-GAP-013 → wire CORE-05/06 in staging only  
4. CORE12-GAP-005 → CORE-09 pilot (after entry criteria)  
5. CORE12-GAP-006 → CORE-11 real-money review (after all prior PASS)  

---

## 7. Verdict

**Market launch: NO-GO** until CRITICAL gaps at required tiers are **CLOSED** with filed evidence. See [Conservative Verdict](./ZORA_WALAT_CORE12_CONSERVATIVE_VERDICT_2026_05_29.md).

---

*End of gap register.*
