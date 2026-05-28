# AFG-CARD-00 Domestic Cash-In, Cash-Out, And ATM Flow Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / DOMESTIC ONLY**

---

## 1. Domestic cash-in concept

| Method | Boundary |
|--------|----------|
| Bank deposit to program account | Bank partner rail |
| Bank app transfer to wallet | Domestic only |
| Approved agent/partner cash-in | Contract + limits — **placeholder** |

**Foreign funding rails:** **EXCLUDED**.

---

## 2. Bank deposit / cash-in boundary

| Rule | Policy |
|------|--------|
| Source account must be domestic Afghan bank | **REQUIRED** |
| Sender name match policy | KYC |
| Sanctions screen | **REQUIRED** |

---

## 3. Approved partner / agent cash-in (placeholder)

| Control | Status |
|---------|--------|
| Agent network contract | **NOT SIGNED** |
| Per-transaction cap | **NOT APPROVED** |
| Agent settlement | Daily recon |

---

## 4. ATM withdrawal concept

| Step | Actor |
|------|-------|
| User at domestic ATM | Network |
| Auth request | Switch → issuer |
| Cash dispensed | ATM operator |
| Ledger debit | Issuer |

---

## 5. Bank branch withdrawal concept

| Step | Notes |
|------|-------|
| User requests cash-out at branch | Bank partner process |
| Identity verification | Branch policy |
| AFN disbursement | Settlement debit |

---

## 6. Cash-out limits

| Limit type | Approval |
|------------|----------|
| Daily ATM withdrawal | Issuer + compliance |
| Monthly cash-out aggregate | Compliance |
| Single transaction max | Policy table — **not approved** |

---

## 7. Settlement dependency

Cash-in/out not final until bank/switch settlement confirms — see [ledger](./ZORA_WALAT_AFG_CARD00_DOMESTIC_LEDGER_SETTLEMENT_RECONCILIATION_BOUNDARY_2026_05_28.md).

---

## 8. Enablement claim boundary

| Claim | Status |
|-------|--------|
| Flows specified | **YES** |
| ATM / cash-out enabled | **NOT CLAIMED** |
| Cross-border cash-in | **FORBIDDEN** |

---

*AFG-CARD-00 cash/ATM — domestic only; not enabled*
