# CORE-01 International Call Product Boundary Review

**Date:** 2026-05-28
**Product:** International calling (boundary definition only)
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)
**Default:** **NOT international-call-ready**

---

## 1. International call scope options (observed in repo)

The repository contains **multiple incompatible representations** of "calling." None is checkout-active in Phase 1.

| Option | Description | Repo evidence | Fulfillment path |
|--------|-------------|---------------|------------------|
| **A. Direct international calling** | VoIP/SIP or app-based dial-out | Marketing copy only | **None** |
| **B. Airtime credit for calling** | Top-up airtime used for voice | Overlaps with mobile top-up | Partial overlap with airtime only |
| **C. PIN / voucher** | Issued PIN for dial-in access | Not found | **None** |
| **D. Minutes bundle (retail SKU)** | Prepaid minute packages | `mockCatalog.ts` calling tiers; `mock_intl_weekly` in `packageCatalog.js` | **Mock only** |
| **E. Future provider capability** | DT One or other telecom API | `dtone.placeholder.js` | **Placeholder** |

**CORE-01 does not select a product option — it records that definition is unresolved.**

---

## 2. Unresolved product-definition gaps

| Gap ID | Question | Status |
|--------|----------|--------|
| IC-DEF-01 | Is "calling" the same as airtime top-up for AF operators? | **UNRESOLVED** |
| IC-DEF-02 | Are minute estimates in mock catalog (`~60 min*`) legally disclaimered and provider-backed? | **NO — mock only** |
| IC-DEF-03 | Is international call in-scope for Phase 1 pilot at all? | **NO — excluded by `isCheckoutActiveProductType`** |
| IC-DEF-04 | Which corridors (sender → callee countries) are in scope? | **UNRESOLVED** |
| IC-DEF-05 | Weekly bundle (`international_call_weekly`) vs one-time minute packs — which is canonical? | **UNRESOLVED** |

---

## 3. Provider dependency gaps

| Gap ID | Gap | Severity |
|--------|-----|----------|
| IC-PRV-01 | No active voice/SIP provider integration | **Critical** |
| IC-PRV-02 | Reloadly web top-up adapter explicitly **airtime only** — not calling SKUs | **High** |
| IC-PRV-03 | DT One placeholder not wired to checkout or fulfillment | **High** |
| IC-PRV-04 | No provider catalog for calling products | **Critical** |

---

## 4. Regulatory / compliance boundary

| Topic | Status |
|-------|--------|
| VoIP / telecom resale licensing | **NOT REVIEWED in this pack** — requires legal/compliance gate |
| Sanctions / restricted destinations | Top-up compliance module exists (`topup/compliance/restrictedCodes.ts`) — calling-specific rules **UNKNOWN** |
| Marketing claims vs executable product | **RISK** — UI/marketing mentions calling; checkout cannot fulfill |
| Cross-border vs domestic-only tracks | AFG-CARD tracks are **PARKED** and domestic-only; do not conflate with diaspora calling product |

---

## 5. UX / support implications

| Implication | Risk |
|-------------|------|
| User selects "calling" in mock catalog | Checkout may fail or route incorrectly if ever enabled without gate |
| Minute estimates shown | Misleading if not provider-guaranteed |
| Support tickets for "calls not working" | **Likely** if marketing promises calling before product exists |
| Receipt content | No calling-specific receipt schema reviewed |

---

## 6. Recommendation: define boundary before implementation

**Recommended sequence (governance only — not authorized execution):**

1. **Product council decision:** Choose one canonical calling model (A–E above) or defer calling from roadmap.
2. **Align UX:** Remove or clearly label non-purchasable calling surfaces until checkout-active.
3. **Provider diligence:** Identify provider contract for chosen model (Reloadly data/voice SKU vs alternate).
4. **Compliance review:** Corridor and licensing sign-off before any sandbox call.
5. **Separate implementation gate:** CORE-02+ or dedicated CALL-CORE pack — **NOT part of CORE-01**.

---

## 7. No international-call-ready claim

| Claim | Allowed? |
|-------|----------|
| International-call-ready | **NO** |
| Calling checkout enabled | **NO** |
| Provider selected for calling | **NO** |
| Calling pilot | **NO-GO** |

---

*CORE-01 international call boundary — definition required before engineering*
