# L-90C2A Zora Card Legal + Pricing + Card Data Safety Concept Lock — 2026-07-07

## 1. Purpose

Lock the **Zora Card** concept, pricing assumptions, legal boundaries, card data safety rules, visible-card-field restrictions, and NO-GO controls **before any implementation**.

This gate defines planning constraints only. It does **not** authorize code, wallet logic, card issuance, KYC collection, payments, cash-in/cash-out, or any commercial launch.

**Branch:** `gate/l90c2a-zora-card-legal-pricing-concept-lock-2026-07-07`  
**Prior gates:** PR #322 (audit + pivot), PR #323 (PIVOT-CP-01), PR #324 (L-90C1A1 name-clearance readonly plan)  
**Mode:** DOCS ONLY / PLAN ONLY

---

## 2. Legal disclaimer

This document is:

- **Not** legal advice or regulatory approval
- **Not** payment network (Mastercard/Visa) approval
- **Not** bank or e-money license clearance
- **Not** authorization to collect customer KYC or sensitive data in production
- **Not** authorization to issue physical cards or process real money

Only qualified local counsel, financial regulators, licensed partners, and security/privacy reviewers may approve implementation. Zora-Walat legacy systems remain **frozen** and separate.

---

## 3. Product definition

**Zora Card** is a **prepaid / stored-value member card concept only.**

| Statement | Status |
|-----------|--------|
| It is **not** a credit card | **LOCKED** |
| It is **not** a loan product | **LOCKED** |
| It does **not** allow overdraft | **LOCKED** |
| It does **not** allow negative balance | **LOCKED** |
| It is **not** a Mastercard product | **LOCKED** |
| It is **not** a Visa product | **LOCKED** |
| It is **not** authorized for public launch | **LOCKED** |
| It is **not** authorized for public issuance | **LOCKED** |
| It is **not** authorized for real payments | **LOCKED** |
| It is **not** authorized for cash-in or cash-out | **LOCKED** |

**Relationship to Zora-Walat:** Zora-Walat Phase-1 checkout and Reloadly scaffolding remain **legacy/frozen**. Zora Card is a **future module placeholder** under pivot architecture (`ZORA_CARD_ENABLED=false` per `ZORA_TARGET_ARCHITECTURE_2026_07_07.md`). No merge or in-place rebrand.

---

## 4. Customer onboarding concept (planning only)

| Step | Requirement |
|------|-------------|
| 1 | Customer applies for **Zora membership** (not live) |
| 2 | Customer submits **legally required** identity and address documents per approved KYC policy |
| 3 | Customer may submit work/location information **only if** required by approved KYC policy |
| 4 | Customer must pass **KYC / AML / sanctions / fraud** review before activation |
| 5 | A raw/inactive card may **only** become usable after approval |
| 6 | **No card is active** before legal/KYC approval |
| 7 | Rejected or incomplete applications **must not** activate a card |
| 8 | All customer identity data must be handled under **approved privacy/security controls** before any implementation |

**Status:** Concept only. No production onboarding, no data collection, no activation workflow authorized.

---

## 5. Card issuance fee policy (locked assumptions)

| Rule | Lock |
|------|------|
| Customer may pay **actual card printing / preparation / activation cost only** | **LOCKED** |
| Issuance fee collected **only after** required legal/KYC document workflow is completed and approved | **LOCKED** |
| First card issuance fee = **cost-recovery only** during launch planning | **LOCKED** |
| **No hidden markup** in the first card issuance plan | **LOCKED** |
| Replacement card pricing | **Separately approved** — not locked here |
| Card fee must be **shown before customer confirmation** | **LOCKED** |
| No customer charged for a **usable** card before activation eligibility is approved | **LOCKED** |

---

## 6. Customer transaction fee policy (locked assumptions)

| Rule | Lock |
|------|------|
| Customer spending fee inside Zora services | **0%** |
| No additional purchase transaction fee when buying from merchants | **LOCKED** |
| No hidden customer fee | **LOCKED** |
| No surprise checkout fee | **LOCKED** |
| Customer purchase total must be **transparent before confirmation** | **LOCKED** |

---

## 7. Merchant transaction fee policy (locked assumptions)

| Rule | Lock |
|------|------|
| Merchant / seller transaction fee | **1% of sale amount** |
| Equivalent formula | **1 AFN per 100 AFN sale** |
| Fee deducted from **merchant settlement**, not charged to customer | **LOCKED** |

**Example (planning reference only):**

| Party | Amount |
|-------|--------|
| Customer pays | 100 AFN |
| Merchant receives | 99 AFN |
| Zora fee | 1 AFN |

| Disclosure rule | Lock |
|-----------------|------|
| Merchant fee disclosed in merchant agreement and settlement reports | **LOCKED** |
| Merchant fee visible in settlement breakdown | **LOCKED** |
| Merchant settlement must **not** hide Zora fee deductions | **LOCKED** |

---

## 8. Cash-in / top-up policy

| Rule | Status |
|------|--------|
| Cash-in / top-up | **NO-GO** until legal/provider/bank/agent approval |
| Any future cash-in fee | **Separately approved** |
| Cash-in enablement | **Not allowed** without licensed/approved partner model |
| Direct public money collection by Zora | **Not allowed** until legal review passes |
| Agent, bank, exchange, or branch model | **Not approved** by this document |

**Note:** Zora-Walat legacy wallet/top-up routes (`POST /api/wallet/topup` per audit) remain **frozen** — not Zora Card authorization.

---

## 9. Cash-out / refund policy

| Rule | Status |
|------|--------|
| Cash-out | **NO-GO** until legal/provider approval |
| Refund rules | **Separately documented** (not in this gate) |
| Manual refund without audit trail | **Forbidden** |
| Cash-out promise to customers | **Forbidden** before legal/provider approval |

---

## 10. Physical card visible-field policy

### ZORA_CARD_VISIBLE_FIELDS_ALLOWED

| Field | Status |
|-------|--------|
| Cardholder display name | **ALLOWED** |
| Zora Member ID | **ALLOWED** |
| Internal Card ID / masked token | **ALLOWED** |
| Issue date | **ALLOWED** |
| Expiry date | **ALLOWED** |
| QR/NFC token (encrypted/inactive) | **ALLOWED** — see §11 |
| Support contact | **ALLOWED** |

### ZORA_CARD_VISIBLE_FIELDS_FORBIDDEN

| Field | Status |
|-------|--------|
| Date of birth | **FORBIDDEN** |
| Home address | **FORBIDDEN** |
| Work address | **FORBIDDEN** |
| National ID / passport number | **FORBIDDEN** |
| Phone number | **FORBIDDEN** (default) |
| PIN | **FORBIDDEN** |
| Security code / CVV | **FORBIDDEN** |
| Full KYC details | **FORBIDDEN** |

---

## 11. Physical card data-safety rules

| Rule | Lock |
|------|------|
| Date of birth must **not** be printed on physical card | **LOCKED** |
| Home address must **not** be printed | **LOCKED** |
| Work address must **not** be printed | **LOCKED** |
| National ID, Tazkira, passport, or government ID number must **not** be printed | **LOCKED** |
| Phone number must **not** be printed unless later legal/security review explicitly approves a **support-only** contact field controlled by Zora | **LOCKED** |
| PIN must **never** be printed on card | **LOCKED** |
| Security code / CVV must **not** be printed for this concept | **LOCKED** |
| Full KYC details remain off-card under approved secure systems | **LOCKED** |
| QR/NFC token: encrypted, inactive until approval, revocable, no sensitive PII in payload | **LOCKED** |
| Lost/stolen card risk considered before implementation | **REQUIRED** |
| Card design minimizes identity theft, fraud, stalking, physical security risk | **LOCKED** |

**PCI / card-network scope:** This concept is **not** a bank card PAN/CVV product. No storage of PIN, CVV, or sensitive authentication data is authorized. Any future change that approaches payment-card scope requires separate PCI and network review.

---

## 12. Sensitive data handling concept

The following are **backend-sensitive data only** (concept — no production storage authorized):

- Customer legal name
- Date of birth
- Address (home)
- Work information
- Phone number
- Government ID
- Document images
- KYC status
- AML result
- Sanctions result
- Fraud-risk result
- Activation status

| Rule | Lock |
|------|------|
| Must **not** be exposed publicly | **LOCKED** |
| Must **not** be printed on card | **LOCKED** |
| Must **not** leak in logs | **LOCKED** |
| Must **not** be included in QR payloads | **LOCKED** |
| Must **not** be visible to merchants | **LOCKED** |

**Future implementation prerequisites (not approved here):**

- Encryption at rest and in transit
- Role-based access control
- Audit logging
- Retention and deletion policy
- Data minimization
- Breach-response policy
- Privacy impact review

**No sensitive customer data storage is approved by this document.**

---

## 13. Merchant settlement requirements (concept — not implemented)

| Requirement | Status |
|-------------|--------|
| Settlement ledger | **Required before launch** |
| Transaction audit log | **Required before launch** |
| Fee breakdown | **Required before launch** |
| Dispute handling | **Required before launch** |
| Reversal handling | **Required before launch** |
| No duplicate transaction settlement | **Required before launch** |
| No service without confirmed payment | **Required before launch** |
| Safe failover and reconciliation | **Required before launch** |

**Merchant-visible settlement report fields (minimum):**

| Field | Required |
|-------|----------|
| Gross sale | Yes |
| Zora fee (1%) | Yes |
| Net settlement | Yes |
| Reversal | Yes |
| Refund | Yes |
| Dispute status | Yes |

---

## 14. Compliance gates required before implementation

All gates below are **NOT PASSED** as of this document:

| Gate | Status |
|------|--------|
| Local legal counsel review | **NOT PASSED** |
| Financial regulator review / licensed partner review | **NOT PASSED** |
| KYC/AML policy | **NOT PASSED** |
| Sanctions screening policy | **NOT PASSED** |
| Fraud monitoring policy | **NOT PASSED** |
| Customer terms | **NOT PASSED** |
| Merchant agreement | **NOT PASSED** |
| Fee disclosure | **NOT PASSED** |
| Data privacy review | **NOT PASSED** |
| Security review | **NOT PASSED** |
| Provider/settlement partner agreement | **NOT PASSED** |
| Physical card data-safety review | **NOT PASSED** |
| Lost/stolen card process | **NOT PASSED** |
| Customer dispute policy | **NOT PASSED** |
| Merchant settlement policy | **NOT PASSED** |
| Incident response policy | **NOT PASSED** |

**Audit cross-reference:** R-005 (real money), R-007 (personal Stripe bank), R-010 (KYC/AML design only), R-020 (PCI not proven) — `ZORA_WALAT_SECURITY_RISK_REGISTER_2026_07_07.md`.

---

## 15. Explicit NO-GO

This document does **not** authorize:

- Code implementation
- Wallet activation
- Card activation
- Cash-in
- Cash-out
- Public card issuance
- Customer onboarding
- Merchant onboarding
- Real payments
- Merchant settlement
- Mastercard/Visa claim
- Printing production cards
- Collecting customer KYC data in production
- Storing customer sensitive data in production
- Issuing cards with DOB / address / workplace / security code / CVV / PIN
- Production launch
- Market claim
- Investor claim
- Revenue claim

---

## 16. Claim locks preserved

```
GLOBAL_LAUNCH_PASS=NO
REAL_MONEY_PASS=NO
PROVIDER_PASS=NO
COMPLIANCE_PASS=NO
MARKET_PASS=NO
INVESTOR_READY=NO
BRAND_CLEARANCE_PASS=NO
LEGAL_NAME_CLEARANCE_PASS=NO
CARD_NETWORK_CLAIM=NO
MASTERCARD_CLAIM=NO
VISA_CLAIM=NO
CARD_LAUNCH_PASS=NO
CASH_IN_PASS=NO
CASH_OUT_PASS=NO
CUSTOMER_KYC_COLLECTION_PASS=NO
PHYSICAL_CARD_ISSUANCE_PASS=NO
CARD_DATA_SECURITY_PASS=NO
GLOBAL_REAL_BUSINESS_PROOF=12%_UNCHANGED
```

---

## 17. Final locked pricing assumptions

```
ZORA_CARD_PRINTING_FEE=ACTUAL_COST_ONLY
ZORA_CARD_PRINTING_FEE_COLLECTION=ONLY_AFTER_REQUIRED_LEGAL_KYC_DOCUMENT_WORKFLOW_APPROVAL
ZORA_CUSTOMER_SPENDING_FEE=0_PERCENT
ZORA_MERCHANT_TRANSACTION_FEE=1_PERCENT
ZORA_MERCHANT_FEE_FORMULA=1_AFN_PER_100_AFN_SALE
ZORA_CUSTOMER_PURCHASE_TRANSACTION_FEE=0_PERCENT
ZORA_CREDIT_ALLOWED=NO
ZORA_OVERDRAFT_ALLOWED=NO
ZORA_NEGATIVE_BALANCE_ALLOWED=NO
ZORA_CASH_IN=NO_GO_UNTIL_LEGAL_PROVIDER_APPROVAL
ZORA_CASH_OUT=NO_GO_UNTIL_LEGAL_PROVIDER_APPROVAL
IMPLEMENTATION=NO_GO
```

---

## 18. Final locked card-data assumptions

```
ZORA_CARD_VISIBLE_NAME=ALLOWED
ZORA_MEMBER_ID=ALLOWED
ZORA_INTERNAL_CARD_ID_MASKED_TOKEN=ALLOWED
ZORA_CARD_ISSUE_DATE=ALLOWED
ZORA_CARD_EXPIRY_DATE=ALLOWED
ZORA_CARD_QR_NFC_TOKEN=ALLOWED_ONLY_IF_ENCRYPTED_INACTIVE_REVOCABLE
ZORA_SUPPORT_CONTACT=ALLOWED
ZORA_CARD_PRINTED_DOB=NO
ZORA_CARD_PRINTED_HOME_ADDRESS=NO
ZORA_CARD_PRINTED_WORK_ADDRESS=NO
ZORA_CARD_PRINTED_NATIONAL_ID=NO
ZORA_CARD_PRINTED_PHONE_NUMBER=NO
ZORA_CARD_PRINTED_PIN=NO
ZORA_CARD_PRINTED_CVV_SECURITY_CODE=NO
ZORA_CARD_PRINTED_FULL_KYC_DETAILS=NO
```

---

## 19. Final verdict

```
L-90C2A=ZORA_CARD_LEGAL_PRICING_CARD_DATA_SAFETY_CONCEPT_LOCK_CREATED
CARD_LAUNCH=NO-GO
PAYMENT_IMPLEMENTATION=NO-GO
CUSTOMER_KYC_COLLECTION=NO-GO
PHYSICAL_CARD_ISSUANCE=NO-GO
IMPLEMENTATION=NO-GO
```

---

## 20. Next recommended action

**L-90C2B — Legal/compliance/card-data evidence checklist for Zora Card (read-only only)**

Operator or counsel performs evidence collection against §14 compliance gates and §10–§11 card-data rules. No implementation, no KYC collection, no card printing, no wallet activation.

---

## NON_CLAIMS

- Zora Card is a planning concept only.
- No legal, regulatory, network, or bank approval is claimed.
- Pricing assumptions are locked for planning — not filed with any regulator.
- Zora-Walat legacy payment paths remain frozen and separate.

---

*L-90C2A complete. Docs only. No implementation. No commits.*
