# CORE-12 Provider · Payment · Webhook · Order · Wallet Gap Matrix

**Date:** 2026-05-29  
**Scope:** Ap786 only · domain gap matrix across CORE-01..11  

---

## 1. Domain definitions

| Domain | Scope in zora_walat | Primary CORE tracks |
|--------|---------------------|---------------------|
| **Provider** | Reloadly catalog, sandbox, fulfill API | CORE-01, 02, 07 |
| **Payment** | Stripe Checkout, intents, refunds | CORE-01, 03, 11 + legacy L-* |
| **Webhook** | Stripe slim path, ordering, duplicate ack | CORE-03, 05 + legacy L-* |
| **Order** | Checkout session → order state → fulfillment | CORE-01, 03, 06 |
| **Wallet** | Balance / settlement / duplicate money movement | CORE-05, 11 |

---

## 2. Gap matrix

| Gap ID | Domain | Gap statement | Observed in repo/docs | Proof tier | Status |
|--------|--------|---------------|----------------------|------------|--------|
| PWOW-01 | Provider | Reloadly catalog readiness not evidenced | CORE-01 review | `STAGING` | **OPEN** |
| PWOW-02 | Provider | Sandbox vs real boundary not drill-proven | CORE-02, 07 | `STAGING` | **OPEN** |
| PWOW-03 | Provider | Top-up path gaps (CORE1 top-up report) | CORE-01 | `STAGING` | **OPEN** |
| PWOW-04 | Provider | Data package disabled Phase 1 | CORE-01 | N/A until enabled | **OPEN** |
| PWOW-05 | Provider | International call product undefined | CORE-01 | `DOCS_ONLY` | **OPEN** |
| PWOW-06 | Payment | Checkout → provider dependency reviewed only | CORE-01 checkout review | `STAGING` | **NOT VERIFIED** live |
| PWOW-07 | Payment | Real-money financial controls not signed off | CORE-11 | `LIVE` + finance | **PENDING** |
| PWOW-08 | Webhook | Duplicate webhook safety — automated PASS staging partial | L-5/L-13 packs | `STAGING` partial | **PARTIAL** / live **PENDING** |
| PWOW-09 | Webhook | Event ordering (PI vs checkout) — automated PASS | L-6 | `STAGING` replay **PENDING** | **PARTIAL** |
| PWOW-10 | Webhook | Unmatched event fast-ack — automated PASS | L-7 | `STAGING` **PENDING** | **PARTIAL** |
| PWOW-11 | Webhook | Idempotency kernel not in webhook handler path | CORE-05 boundary | `STAGING` | **NOT_WIRED** |
| PWOW-12 | Order | State machine review — read-only, not staging-verified | CORE-03 | `STAGING` | **NOT_VERIFIED** |
| PWOW-13 | Order | NPNS delivery engine — local fixtures only | CORE-06 | `LOCAL_FIXTURE` | **NOT_WIRED** |
| PWOW-14 | Order | Fulfilled-without-payment / stale pending — local proof only | CORE-06 tests | `LOCAL_FIXTURE` | live **PENDING** |
| PWOW-15 | Wallet | Duplicate transaction classify — not on settlement path | CORE-05 | `LIVE` | **NOT_WIRED** |
| PWOW-16 | Wallet | Settlement boundary documented not proven | CORE-11 financial | `LIVE` | **PENDING** |
| PWOW-17 | Cross | Fail-closed provider failure rules — policy only | CORE-02 NPNS rules | `STAGING` | **NOT_VERIFIED** |
| PWOW-18 | Cross | Safe repair must not mutate money path without gate | CORE-08 | apply off | **CONTROLLED** |
| PWOW-19 | Cross | Audit / trace correlation for money path | CORE-10 | `STAGING` | **PENDING** |
| PWOW-20 | Cross | Incident abort / rollback for provider+payment | CORE-07, 09 | `STAGING` | **NOT_EXECUTED** |

---

## 3. Domain rollup

| Domain | OPEN | PARTIAL | NOT_WIRED | LIVE-ready |
|--------|------|---------|-----------|------------|
| Provider | 5 | 0 | 0 | **NO** |
| Payment | 2 | 0 | 0 | **NO** |
| Webhook | 1 | 3 | 1 | **NO** |
| Order | 2 | 0 | 1 | **NO** |
| Wallet | 2 | 0 | 1 | **NO** |
| Cross | 3 | 0 | 0 | **NO** |

---

## 4. CORE track coverage per domain

| Domain | CORE-01 | CORE-02 | CORE-03 | CORE-04 | CORE-05 | CORE-06 | CORE-07 | CORE-08 | CORE-09 | CORE-10 | CORE-11 |
|--------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|
| Provider | ● | ● | ○ | — | — | — | ● | — | ○ | — | ○ |
| Payment | ● | ○ | ● | — | ○ | ○ | ○ | — | ● | ○ | ● |
| Webhook | ○ | ○ | ● | ○ | ● | ○ | ○ | — | ○ | ● | ○ |
| Order | ● | ○ | ● | ○ | ○ | ● | ○ | — | ● | ○ | ○ |
| Wallet | — | — | ○ | — | ● | ○ | — | ○ | ● | — | ● |

● = primary gap source · ○ = supporting · — = minimal direct coverage

---

## 5. Allowed vs forbidden claims (domain)

| Domain | Allowed now | Forbidden |
|--------|-------------|-----------|
| Provider | “Gaps documented”; “drill gate filed” | “Provider-approved for launch” |
| Payment | “Dependencies reviewed”; legacy staging partial | “Real-money-ready” |
| Webhook | “Automated tests PASS” (scoped) | “Production duplicate-safe” without live EV |
| Order | “NPNS engine local PASS” | “No fulfillment without pay” in prod |
| Wallet | “Idempotency model filed” | “No duplicate settlements” in prod |

---

## 6. Related documents

- [Gap register](./ZORA_WALAT_CORE12_MARKET_READINESS_GAP_REGISTER_2026_05_29.md)  
- [Real-money blocker map](./ZORA_WALAT_CORE12_REAL_MONEY_BLOCKER_MAP_2026_05_29.md)  
- [Reconciliation](./ZORA_WALAT_CORE12_FINAL_CORE_EVIDENCE_RECONCILIATION_2026_05_29.md)  

---

*End of gap matrix.*
