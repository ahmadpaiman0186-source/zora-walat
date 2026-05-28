# XCH-05 Corridor Readiness And Jurisdiction Gate Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO CORRIDOR LAUNCH**

**Related:** [XCH-00 corridor map](./ZORA_WALAT_XCH00_COUNTRY_CORRIDOR_COMPLIANCE_MAP_2026_05_27.md) · [XCH-01 corridor matrix](./ZORA_WALAT_XCH01_COMPLIANCE_AND_CORRIDOR_GATE_MATRIX_2026_05_28.md)

---

## 1. Corridor definition

| Field | Description |
|-------|-------------|
| `corridorId` | Stable identifier |
| `sendJurisdiction` | Origin country/region regulatory scope |
| `receiveJurisdiction` | Destination regulatory scope |
| `sendCurrency` | ISO 4217 |
| `receiveCurrency` | ISO 4217 |
| `payoutMethod` | e.g. bank, mobile wallet, cash pickup |
| `corridorStatus` | `blocked` \| `review` \| `approved` (future) |

**Default for all corridors:** `blocked`.

---

## 2. Sending jurisdiction gate

| Check | Required | Status |
|-------|----------|--------|
| Outbound remittance legality | Legal memo | **NOT OBTAINED** |
| Customer disclosure requirements | Compliance review | **NOT APPROVED** |
| Tax / reporting obligations | Legal review | **NOT OBTAINED** |
| Sender KYC threshold | Policy defined | **PLACEHOLDER** |

Fail any check → corridor **BLOCKED**.

---

## 3. Receiving jurisdiction gate

| Check | Required | Status |
|-------|----------|--------|
| Inbound payout legality | Legal memo | **NOT OBTAINED** |
| Recipient identification rules | Policy defined | **PLACEHOLDER** |
| Local partner / rail requirements | Due diligence | **NOT COMPLETE** |
| FX / capital controls review | Legal review | **NOT OBTAINED** |

---

## 4. Currency / corridor restrictions

| Restriction type | Rule |
|------------------|------|
| Prohibited currency pairs | Legal-defined list — **empty until review** |
| Amount limits per corridor | Config table — **not approved** |
| High-risk corridor flag | Requires enhanced due diligence |

---

## 5. Payout method restrictions

| Method | Gate |
|--------|------|
| Bank transfer | Partner due diligence + legal |
| Mobile wallet | Rail-specific licensing review |
| Cash pickup | Agent network compliance review |

No payout method enabled without corridor gate pass.

---

## 6. Legal review required

| Deliverable | Owner | Status |
|-------------|-------|--------|
| Per-corridor legal memo | External counsel | **NOT FILED** |
| Terms of service alignment | Legal | **NOT REVIEWED** |
| Marketing claim boundary | Legal + compliance | **NOT APPROVED** |

---

## 7. Licensing / registration review required

| Item | Status |
|------|--------|
| Money transmitter licenses | **NOT OBTAINED** |
| Agent / partner registrations | **NOT OBTAINED** |
| Regulatory notifications | **NOT FILED** |

---

## 8. Corridor launch claim boundary

| Claim | Status |
|-------|--------|
| Corridor model specified | **YES** |
| Any corridor launched | **NO** |
| Remittance-ready | **NOT CLAIMED** |

---

## 9. Unresolved corridor risk NO-GO

| Condition | Gate |
|-----------|------|
| Open legal question on corridor | **NO-GO** |
| Licensing gap | **NO-GO** |
| Unresolved XCH00/XCH01 corridor blocker | **NO-GO** |

---

*XCH-05 corridor gates — no launch authorized*
