# AFG-CARD-00 Utility Bill Payment And Mobile Top-Up Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO EXECUTION**

---

## 1. Utility bill payment concept

| Step | Actor |
|------|-------|
| User selects biller + account ref | Platform |
| Balance / limit check | Wallet |
| Payment instruction | Switch / biller API (future) |
| Confirmation receipt | User + audit |

**Domestic billers only.**

---

## 2. Bill type placeholders

| Biller class | Placeholder | Contract |
|--------------|-------------|----------|
| **Electricity** | Disco / utility ID | **NOT SIGNED** |
| **Water** | Municipal utility ID | **NOT SIGNED** |
| Other utilities | Catalog TBD | Legal review |

---

## 3. Telecom / mobile top-up concept

| Step | Notes |
|------|-------|
| User selects operator + MSISDN + amount | Domestic operators only |
| Top-up instruction | Telecom aggregator API (future) |
| Airtime credit | Operator confirmation |

---

## 4. Mobile top-up transfer concept

| Type | Boundary |
|------|----------|
| Top-up own number | Standard |
| Top-up third-party AF number | Policy + limits |
| Cross-border top-up | **FORBIDDEN** |

---

## 5. Biller / provider contract dependency

| Contract | Status |
|----------|--------|
| Electricity biller | **NOT SIGNED** |
| Water biller | **NOT SIGNED** |
| Bill aggregator | **NOT SIGNED** |

---

## 6. Telecom / top-up provider dependency

| Contract | Status |
|----------|--------|
| Mobile operator direct | **NOT SIGNED** |
| Top-up aggregator | **NOT SIGNED** |

---

## 7. Reconciliation requirements

| Match | Frequency |
|-------|-----------|
| Platform vs biller settlement file | Daily |
| Platform vs telecom confirmation | Daily |
| Unmatched payment | `RECON-BILL-*` / `RECON-TOPUP-*` hold |

---

## 8. Execution claim boundary

| Claim | Status |
|-------|--------|
| Models specified | **YES** |
| Bill payment executed | **NOT CLAIMED** |
| Top-up executed | **NOT CLAIMED** |
| Biller/telecom approved | **NOT CLAIMED** |

---

*AFG-CARD-00 bill pay / top-up — not executed*
