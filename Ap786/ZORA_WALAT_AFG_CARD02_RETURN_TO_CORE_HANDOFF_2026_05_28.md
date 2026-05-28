# AFG-CARD-02 Return To Core Handoff

**Date:** 2026-05-28
**Status:** **ACTIVE DIRECTIVE**

---

## 1. Core Zora-Walat becomes priority

With AFG-CARD **PARKED**, engineering and program focus **returns to the existing Zora-Walat product** — mobile services, checkout, payments safety, and operational proof — **not** domestic wallet/card/bank rails.

AFG-CARD documents remain **reference architecture only**.

---

## 2. Priority focus areas

| Priority | Focus | Notes |
|----------|-------|-------|
| **P1** | Mobile top-up execution | Core product delivery |
| **P1** | Data packages | Product catalog + fulfillment |
| **P1** | International call | Product **boundary** — not AFG-CARD wallet |
| **P1** | Provider reliability | Uptime, error handling, retries (safe) |
| **P1** | Checkout / webhook proof | Stripe path; no-pay-no-service |
| **P1** | Fail-closed order safety | Duplicate prevention; terminal states |
| **P2** | Receipt / support / user trust | UX + ops evidence |
| **P2** | Controlled pilot readiness | **Core product** pilot gates only |

---

## 3. Explicit non-priority (while parked)

| Track | Status |
|-------|--------|
| AFG-CARD wallet/card implementation | **NOT IN SCOPE** |
| AFG-CARD bank / APS / AfPay integration | **NOT IN SCOPE** |
| AFG-CARD bill pay on wallet rail | **NOT IN SCOPE** |
| XCH remittance implementation | **NOT IN SCOPE** (separate gates) |
| CARD-00 cross-border card | **NOT IN SCOPE** |

---

## 4. Handoff to agents / engineers

When starting work:

1. Read [FINAL_REBOOT_BRIEF](./ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md)
2. Confirm AFG-CARD **PARKED** via this pack
3. Work only on **approved core tracks** unless activation phrase issued
4. Do **not** interpret AFG-CARD-00/01 docs as implementation authorization

---

## 5. Success criteria (core — not AFG-CARD)

| Area | Target state |
|------|--------------|
| Webhook / checkout | Proven safe paths (staging evidence) |
| Orders | Fail-closed; no duplicate fulfillment |
| Top-up / data | Provider reliability documented |
| Pilot | Core product gate — separate from AFG-CARD |

---

*AFG-CARD-02 — return to core; AFG-CARD parked*
