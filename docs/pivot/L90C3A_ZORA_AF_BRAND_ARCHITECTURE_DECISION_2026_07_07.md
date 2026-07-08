# L-90C3A Zora AF Brand Architecture Decision — 2026-07-07

## Engineering standard (preserved)

**ZORA GLOBAL REAL-PROOF SUPER-SYSTEM ENGINEERING STANDARD**  
**FAMILY-INCOME PRODUCTION BUSINESS STANDARD**  
**ZERO-FALSE-CLAIM / ZERO-DUPLICATE-TRANSACTION / NO-PAY-NO-SERVICE / SAFE-FAILOVER / AUDITABLE-REVENUE STANDARD**

NO GLOBAL LAUNCH, NO AFGHANISTAN MARKET CLAIM, NO MONEY CLAIM, NO CARD CLAIM, NO WALLET CLAIM, NO PROVIDER CLAIM, NO BANK CLAIM, NO COMPLIANCE CLAIM, NO FAMILY-INCOME CLAIM, NO INVESTOR CLAIM WITHOUT DIRECT LEGAL, TECHNICAL, OPERATIONAL, FINANCIAL, PROVIDER, CUSTOMER, AND REAL-WORLD PROOF.

**Branch:** `gate/l90c3a-zora-af-brand-architecture-decision-2026-07-07`  
**Prior gates:** PR #322 (audit + pivot), PR #323 (PIVOT-CP-01), PR #324 (L-90C1A1), PR #325 (L-90C2A)  
**Mode:** DOCS ONLY / PLAN ONLY

---

## 1. Purpose

Lock the **brand architecture decision** for the future **Zora AF** platform before any code rename, UI rename, domain use, legal filing, app-store claim, public launch claim, or market claim.

This gate records **planning names and hierarchy only**. It does **not** perform clearance searches, does **not** prove availability, and does **not** authorize implementation.

---

## 2. Legal disclaimer

This document is:

- **Not** legal advice
- **Not** trademark or name clearance
- **Not** domain or app-store availability proof
- **Not** authorization to use **Zora AF** publicly, commercially, or in code
- **Not** authorization to launch, onboard customers, or claim Afghanistan market entry

Only qualified counsel, operator evidence gates, and future controlled migration checkpoints may authorize public use.

---

## 3. Brand architecture decision

| Identifier | Role | Status |
|------------|------|--------|
| **Zora-Walat** | Legacy / frozen project name | **LOCKED** — engineering asset only; evidence chain preserved |
| **Zora AF** | Future public brand **candidate** | **LOCKED** — short customer-facing label candidate |
| **Zora Afghanistan** | Full market / legal / explanatory label | **LOCKED** — formal long-form label candidate |
| **Zora** | Root / reference naming family only | **LOCKED** — not sole public brand without **AF** qualifier |
| **Zora786** | Internal codename only | **LOCKED** — not public brand |
| **ZoraXpress** | Not primary brand | **LOCKED** — possible future service label only after separate review |

**Hierarchy (planning):**

```
Zora (root reference family)
 └── Zora AF (public brand candidate)
      ├── Zora Afghanistan (formal / legal / explanatory label)
      └── Zora AF [Module] (module candidates — see §5)
Zora-Walat (legacy — parallel, frozen, not renamed)
Zora786 (internal codename — not customer-facing)
ZoraXpress (service label candidate only — not primary)
```

**Relationship to L-90C1A1:** L-90C1A1 listed **Zora**, **Zora Go**, **Zora Card**, etc. as name-clearance candidates. L-90C3A **refines** the public architecture to **Zora AF** as the preferred short public brand, with module names prefixed **Zora AF** for market distinctness. L-90C1A1 clearance checklist still applies; **Zora AF** and **Zora AF [Module]** names require separate search evidence in **L-90C3B**.

**Relationship to L-90C2A:** **Zora AF Card** supersedes **Zora Card** as the **public module label candidate** only. L-90C2A legal, pricing, and card-data-safety locks remain in force for the prepaid concept regardless of label.

---

## 4. Public naming rules

| Use case | Locked label |
|----------|--------------|
| Customer-facing short brand candidate | **Zora AF** |
| Formal market label | **Zora Afghanistan** |
| Internal project codename | **Zora786** |
| Legacy system name | **Zora-Walat** |

**Forbidden public claims (until future proof gates pass):**

| Claim | Status |
|-------|--------|
| Zora AF is legally cleared | **FORBIDDEN** |
| Zora AF is trademark-cleared | **FORBIDDEN** |
| Zora AF is available in app stores | **FORBIDDEN** |
| Zora AF is launched | **FORBIDDEN** |
| Zora AF operates in Afghanistan | **FORBIDDEN** |
| Zora AF accepts payments / issues cards / runs wallet | **FORBIDDEN** |

---

## 5. Module naming model

Future module **candidates** (planning names only):

| Module candidate | Intended scope (planning) |
|------------------|---------------------------|
| **Zora AF Go** | Taxi / ride |
| **Zora AF Card** | Prepaid stored-value member card (L-90C2A concept) |
| **Zora AF Food** | Food delivery |
| **Zora AF Mart** | Grocery |
| **Zora AF TopUp** | Mobile recharge / data |
| **Zora AF Bills** | Utility bill-pay |
| **Zora AF Merchant** | Merchant portal / settlement views |
| **Zora AF Admin** | Operator control tower |
| **Zora AF Support** | Customer support |
| **Zora AF Audit** | Audit / compliance reporting |

**Important:** These are **planning names only**. They do **not** authorize:

- Implementation
- Launch
- Provider claim
- Payment claim
- Card claim
- Wallet claim
- Merchant claim
- Customer claim
- Revenue claim

All module feature flags remain **default OFF** per `ZORA_TARGET_ARCHITECTURE_2026_07_07.md` until separate implementation and compliance gates pass.

---

## 6. Why Zora AF is preferred over Zora alone

| Factor | Rationale |
|--------|-----------|
| Naming conflict risk | **Zora** alone may have higher global trademark and brand collision risk (see L-90C1A1 risk matrix) |
| Market distinctness | **Zora AF** is more distinct for the Afghanistan target planning market |
| **AF** meaning | Treated **only** as Afghanistan market code — not a religious, ethnic, or political claim |
| Clearance still required | **Zora AF** remains subject to legal / name / domain / app-store / trademark review |
| No availability proof | This document does **not** prove availability or clearance for **Zora AF** or **Zora Afghanistan** |

---

## 7. Why Zora786 remains internal only

| Rule | Lock |
|------|------|
| **Zora786** useful as internal codename | **YES** — engineering / program reference only |
| Primary public brand | **NO** |
| Public use risk | May create cultural, legal, market, or global-branding ambiguity if used publicly |
| External reference | **Forbidden** unless a separate brand review gate explicitly approves otherwise |

**Zora786** must not appear in customer-facing UI, app store listings, marketing, or domain names without a dedicated brand review gate.

---

## 8. Zora-Walat legacy rule

| Rule | Lock |
|------|------|
| Zora-Walat codebase may be reused as controlled engineering asset | **YES** — per `ZORA_WALAT_REUSE_OR_FREEZE_DECISION_2026_07_07.md` |
| Zora-Walat business claims transfer to Zora AF | **NO** |
| Zora-Walat payment / provider / market proofs authorize Zora AF launch | **NO** |
| Mass-rename Zora-Walat in code by this gate | **FORBIDDEN** |
| Legacy references remain traceable | **REQUIRED** until controlled migration gate approves changes |

**Evidence preserved:** L-85M, L-86D, L-89B, Ap786 chains, Phase-1 checkout, Reloadly scaffold — remain **Zora-Walat** bounded context.

---

## 9. Domain / app-store / trademark status

All statuses **NOT PROVEN** as of this gate:

| Check | Status |
|-------|--------|
| Domain clearance | **NOT PROVEN** |
| App Store availability | **NOT PROVEN** |
| Google Play availability | **NOT PROVEN** |
| Trademark clearance | **NOT PROVEN** |
| Company-name clearance | **NOT PROVEN** |
| Afghanistan legal-name clearance | **NOT PROVEN** |
| Social handle availability | **NOT PROVEN** |

No searches were executed in L-90C3A. Evidence collection is deferred to **L-90C3B** (read-only).

---

## 10. Explicit NO-GO

This document does **not** authorize:

- Code rename
- UI rename
- Route rename
- API rename
- Env rename
- Database rename
- Domain purchase claim
- Domain ownership claim
- Trademark filing claim
- Trademark clearance claim
- App Store claim
- Google Play claim
- Legal entity claim
- Customer onboarding
- Merchant onboarding
- Card launch
- Wallet launch
- Cash-in
- Cash-out
- Real payments
- Provider claim
- Bank claim
- Afghanistan market claim
- Production launch
- Family-income claim
- Investor claim
- Revenue claim

---

## 11. Claim locks preserved

```
GLOBAL_LAUNCH_PASS=NO
AFGHANISTAN_MARKET_PASS=NO
REAL_MONEY_PASS=NO
PROVIDER_PASS=NO
BANK_PARTNER_PASS=NO
COMPLIANCE_PASS=NO
CARD_LAUNCH_PASS=NO
WALLET_LAUNCH_PASS=NO
CASH_IN_PASS=NO
CASH_OUT_PASS=NO
MERCHANT_SETTLEMENT_PASS=NO
CUSTOMER_ONBOARDING_PASS=NO
KYC_COLLECTION_PASS=NO
CARD_DATA_SECURITY_PASS=NO
FAMILY_INCOME_PASS=NO
MARKET_PASS=NO
INVESTOR_READY=NO
BRAND_CLEARANCE_PASS=NO
LEGAL_NAME_CLEARANCE_PASS=NO
TRADEMARK_CLEARANCE_PASS=NO
DOMAIN_CLEARANCE_PASS=NO
APP_STORE_CLEARANCE_PASS=NO
GOOGLE_PLAY_CLEARANCE_PASS=NO
IMPLEMENTATION=NO-GO
GLOBAL_REAL_BUSINESS_PROOF=12%_UNCHANGED
```

---

## 12. Final locked brand assumptions

```
ZORA_AF_PUBLIC_BRAND_CANDIDATE=YES
ZORA_AFGHANISTAN_FULL_MARKET_LABEL=YES
ZORA_ROOT_REFERENCE_NAME=YES
ZORA_WALAT_LEGACY_FROZEN=YES
ZORA786_INTERNAL_CODENAME_ONLY=YES
ZORAXPRESS_PRIMARY_BRAND=NO
BRAND_CLEARANCE=NOT_PROVEN
LEGAL_NAME_CLEARANCE=NOT_PROVEN
TRADEMARK_CLEARANCE=NOT_PROVEN
DOMAIN_CLEARANCE=NOT_PROVEN
APP_STORE_CLEARANCE=NOT_PROVEN
GOOGLE_PLAY_CLEARANCE=NOT_PROVEN
IMPLEMENTATION=NO_GO
```

---

## 13. Final verdict

```
L-90C3A=ZORA_AF_BRAND_ARCHITECTURE_DECISION_CREATED
PUBLIC_BRAND_CANDIDATE=ZORA_AF
LEGAL_CLEARANCE=NO-GO
TRADEMARK_CLEARANCE=NO-GO
DOMAIN_CLEARANCE=NO-GO
APP_STORE_CLEARANCE=NO-GO
IMPLEMENTATION=NO-GO
```

---

## 14. Next recommended action

**L-90C3B — Brand Conflict / Search Evidence Checklist for Zora AF (read-only only)**

Operator or delegate performs manual searches for **Zora AF**, **Zora Afghanistan**, **Zora AF [Module]** names, domains, app stores, social handles, and trademarks. Store evidence privately; file redacted index only. No purchases, filings, renames, or implementation.

---

## NON_CLAIMS

- **Zora AF** is a planning candidate only — not cleared, not launched, not proven.
- **Zora Afghanistan** is an explanatory label candidate only.
- **Zora786** is internal codename only.
- **Zora-Walat** remains the only proven narrow engineering evidence system in-repo.
- No false market, money, card, wallet, provider, bank, compliance, family-income, or investor claim is authorized.

---

*L-90C3A complete. Docs only. No renames. No commits.*
