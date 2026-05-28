# CARD-00 Bank / Issuer / Processor / Network Model

**Date:** 2026-05-28
**Status:** **ARCHITECTURE ONLY / NO PARTNERSHIPS**

---

## 1. Party roles

| Party | Role | Zora-Walat relationship |
|-------|------|-------------------------|
| **Contracted Afghan bank** | Local regulatory interface; recipient onboarding; cash-out | Partner — **not contracted** |
| **Sponsor / issuer bank** | Card issuing; BIN; regulatory reporting | Partner — **not identified** |
| **Card processor** | Auth, clearing, settlement files | Vendor — **not contracted** |
| **Payment network** | Scheme rules (Visa/MC/local) | Membership — **not approved** |
| **Wallet / platform** | UX, compliance orchestration, APIs | Zora-Walat — **design only** |
| **Settlement bank** | Program settlement accounts | **not opened** |

---

## 2. Contracted Afghan bank role

| Responsibility | Notes |
|----------------|-------|
| Recipient KYC per local regulation | Bank-owned policy |
| Wallet/card activation approval | Bank gate |
| Cash-out / branch services | Where offered |
| Local reporting | Bank obligation |

---

## 3. Sponsor / issuer bank role

| Responsibility | Notes |
|----------------|-------|
| Issue cards under program BIN | Issuer of record |
| Scheme compliance | Network rules |
| Program limits and risk | Issuer underwriting |

---

## 4. Card processor role

| Responsibility | Notes |
|----------------|-------|
| Real-time authorization | ISO 8583 or API |
| Clearing and settlement | T+1 / scheme calendar |
| Dispute/chargeback file exchange | With issuer |

---

## 5. Payment network role

| Responsibility | Notes |
|----------------|-------|
| Network acceptance (ATM/POS/e-com) | Merchant + acquirer dependent |
| Interchange and scheme fees | Program economics |
| Scheme compliance audits | Ongoing |

---

## 6. Wallet / platform role

| Responsibility | Notes |
|----------------|-------|
| Customer UX | App / web |
| Compliance orchestration | Gates before auth |
| Ledger view (non-issuer) | Subject to bank contract |
| **Not** default issuer | Unless separately licensed |

---

## 7. Settlement bank role

| Responsibility | Notes |
|----------------|-------|
| Hold program funds | Segregated accounts |
| FX / cross-border settlement | Corridor-specific |
| Reconciliation with processor | Daily |

---

## 8. Bank due diligence requirements

| DD area | Required before contract |
|---------|--------------------------|
| Regulatory standing | License verification |
| AML/sanctions program | Independent review |
| Technology / security | SOC / audit reports |
| Financial strength | Credit review |
| Incident history | Public + reference checks |

**Due diligence:** **NOT STARTED** for CARD-00.

---

## 9. Claim boundaries

| Claim | Status |
|-------|--------|
| Partner model documented | **YES** |
| Bank partnership | **NOT CLAIMED** |
| Issuer / network approval | **NOT CLAIMED** |

---

*CARD-00 partner model — no contracts*
