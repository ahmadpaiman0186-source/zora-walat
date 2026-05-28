# AFG-CARD-02 Frozen Scope And Blocked Operations Register

**Date:** 2026-05-28
**Status:** **PARKED / ALL OPERATIONS BLOCKED**

---

## Frozen AFG-CARD scope

The following remain **documentation-only** until activation:

- Domestic digital wallet architecture ([AFG-CARD-00](./ZORA_WALAT_AFG_CARD00_DOMESTIC_DIGITAL_WALLET_CARD_ARCHITECTURE_2026_05_28.md))
- Due diligence requirements ([AFG-CARD-01](./ZORA_WALAT_AFG_CARD01_BANK_SWITCH_BILLER_TELECOM_DUE_DILIGENCE_MATRIX_2026_05_28.md))
- Sandbox simulation specs ([AFG-CARD-00 sandbox](./ZORA_WALAT_AFG_CARD00_SANDBOX_DOMESTIC_SIMULATION_BOUNDARY_2026_05_28.md))

---

## Blocked operations register

| Operation | Status | Notes |
|-----------|--------|-------|
| Runtime wallet/card implementation | **BLOCKED** | No code authorized |
| Bank API integration | **BLOCKED** | No contracts |
| APS / AfPay integration | **BLOCKED** | No approval |
| Biller API integration | **BLOCKED** | No contracts |
| Telecom / top-up provider integration (AFG-CARD rail) | **BLOCKED** | Separate from core product top-up |
| Wallet / card balance mutation | **BLOCKED** | No state changes |
| ATM / POS execution | **BLOCKED** | Not enabled |
| Bill payment execution (AFG-CARD rail) | **BLOCKED** | Not enabled |
| Mobile top-up execution (AFG-CARD wallet rail) | **BLOCKED** | Core top-up track separate |
| DB schema / migrations for AFG-CARD | **BLOCKED** | No migrations |
| Pilot launch | **BLOCKED** | NO-GO |
| Production launch | **BLOCKED** | NO-GO |
| Pilot / production **claims** | **FORBIDDEN** | Marketing + investor boundary |
| Cross-border remittance | **FORBIDDEN** | Out of AFG-CARD domestic scope |
| Foreign sender funding | **FORBIDDEN** | |
| CARD-00 cross-border behavior | **FORBIDDEN** | Separate track |
| Real-money movement on AFG-CARD rails | **FORBIDDEN** | |

---

## Violation handling

Any unauthorized AFG-CARD implementation attempt → **STOP** + incident record + revert.

---

*AFG-CARD-02 frozen register — parked*
