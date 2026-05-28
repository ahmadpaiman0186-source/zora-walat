# XCH-00 Transparent Quote / Rate / Fee / Tax Engine Design

**Date:** 2026-05-27
**Status:** **DESIGN ONLY / NOT EXECUTED**

---

## 1. Purpose

Future quote engine must show **complete price transparency** before the sender commits. No hidden conversion, spread, tax, or partner fee.

**Important:** Not all countries/states require tax withholding. Tax and government charge calculation must be **rule-engine based** and **legal-reviewed** per corridor.

---

## 2. Quote components

| Component | Description | Status |
|-----------|-------------|--------|
| Send amount | Amount sender intends to fund | **DESIGN ONLY** |
| Source currency | Origin currency (USD, CAD, EUR, etc.) | **DESIGN ONLY** |
| Destination currency | AFN or supported payout currency | **DESIGN ONLY** |
| Exchange rate | Disclosed rate with source reference | **DESIGN ONLY** |
| Rate timestamp | When rate was obtained | **DESIGN ONLY** |
| Rate lock window | Validity period for quoted rate | **DESIGN ONLY** |
| FX spread | Disclosed margin vs reference rate | **DESIGN ONLY** |
| App fee | Platform fee line item | **DESIGN ONLY** |
| Partner fee | Payout/rail partner fee | **DESIGN ONLY** |
| Bank / payment rail fee | Funding rail cost if passed through | **DESIGN ONLY** |
| Government tax / charge | If legally applicable in corridor | **DESIGN ONLY** |
| Payout amount | What recipient should receive | **DESIGN ONLY** |
| Estimated delivery time | SLA estimate — not guarantee | **DESIGN ONLY** |

---

## 3. Afghanistan payout options

| Option | Rule | Status |
|--------|------|--------|
| Same supported currency | Only where legally and operationally available | **DESIGN ONLY** |
| AFN payout | Disclosed market/reference rate; no hidden conversion | **DESIGN ONLY** |
| No hidden conversion | All FX steps visible in quote breakdown | **DESIGN ONLY** |
| No undisclosed tax/fee | Every deduction labeled | **DESIGN ONLY** |

---

## 4. User receipt (future)

| Field | Status |
|-------|--------|
| Sender pays (total debited) | **DESIGN ONLY** |
| Recipient receives (net payout) | **DESIGN ONLY** |
| Fees / taxes / rate disclosed | **DESIGN ONLY** |
| Cancellation / refund rights | **PLACEHOLDER — LEGAL REVIEW** |
| Dispute / error resolution | **PLACEHOLDER — LEGAL REVIEW** |

---

## 5. Rate evidence and stale-rate risk

| Control | Status |
|---------|--------|
| Rate source attribution | **DESIGN ONLY** |
| Stale rate rejection | **DESIGN ONLY** |
| Re-quote on expiry | **DESIGN ONLY** |

---

## 6. Conservative verdict

| Item | Status |
|------|--------|
| Quote engine implemented | **NO** |
| FX execution enabled | **NO** |
| Tax rules finalized | **NO** |
| Production-ready | **NO** |

---

*XCH-00 quote engine — design only*
