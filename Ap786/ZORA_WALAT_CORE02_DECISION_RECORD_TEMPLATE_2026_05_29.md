# CORE-02 Decision Record Template

**Date:** 2026-05-29  
**Default status:** **NO-GO / NOT APPROVED**

---

## 1. Decision metadata

| Field | Value |
|-------|-------|
| Decision ID | _CORE02-DR-_____ |
| Decision owner | _TBD_ |
| Corridors | ☐ Top-up ☐ Data ☐ Intl call (must be **NO** for call unless CAT-04 IN) |
| Parent pack | [CORE-02 master](./ZORA_WALAT_CORE02_PROVIDER_CATALOG_RELOADLY_SANDBOX_BOUNDARY_2026_05_29.md) |
| Default | **NOT APPROVED** |

---

## 2. Readiness status

| Area | Status |
|------|--------|
| Catalog governance (CORE-02) | **NOT APPROVED** |
| Sandbox boundary understood | **NOT APPROVED** |
| Top-up gate (CORE2-GATE-TU) | **CLOSED** |
| Data gate (CORE2-GATE-DP) | **CLOSED** |
| Intl call gate (CORE2-GATE-IC) | **CLOSED / UNRESOLVED** |
| No-pay-no-service policy | **NOT PROVEN** |
| Evidence minimum (§7 matrix) | **PENDING** |
| Sandbox provider execution | **NOT AUTHORIZED** |
| Controlled pilot | **NO-GO** |
| Production / real money | **NO-GO** |
| Market launch | **NO-GO** |

---

## 3. CORE-02 document acceptance checklist

| Document | Accepted? |
|----------|-----------|
| [Master boundary](./ZORA_WALAT_CORE02_PROVIDER_CATALOG_RELOADLY_SANDBOX_BOUNDARY_2026_05_29.md) | ☐ NO |
| [Evidence matrix](./ZORA_WALAT_CORE02_PROVIDER_CATALOG_EVIDENCE_MATRIX_2026_05_29.md) | ☐ NO |
| [Sandbox vs real](./ZORA_WALAT_CORE02_RELOADLY_SANDBOX_VS_REAL_PROVIDER_BOUNDARY_2026_05_29.md) | ☐ NO |
| [No-pay-no-service](./ZORA_WALAT_CORE02_NO_PAY_NO_SERVICE_PROVIDER_FAILURE_RULES_2026_05_29.md) | ☐ NO |
| [Readiness gates](./ZORA_WALAT_CORE02_TOPUP_DATA_CALL_PROVIDER_READINESS_GATE_2026_05_29.md) | ☐ NO |
| [Risk register](./ZORA_WALAT_CORE02_RISK_REGISTER_2026_05_29.md) | ☐ NO |

---

## 4. Evidence minimum (before sandbox provider execution)

| Bucket | IDs | Filed? | Accepted? |
|--------|-----|--------|-----------|
| Catalog | CORE2-EV-CAT-01, -02 or -03 | ☐ | ☐ |
| Sandbox | CORE2-EV-SBX-01..03 | ☐ | ☐ |
| Payment policy | CORE2-EV-PAY-01, -02 | ☐ | ☐ |

**All boxes must be checked YES for acceptance → still requires explicit authorization below.**

---

## 5. Authorization boundary

| Action | Authorized? |
|--------|-------------|
| File governance docs only | **YES** (always) |
| Reloadly sandbox API calls | ☐ **NO** (default) |
| Catalog sync to production | ☐ **NO** |
| Enable data corridor checkout | ☐ **NO** |
| Enable intl call product | ☐ **NO** |
| Controlled pilot | ☐ **NO** |
| Production launch | ☐ **NO** |

---

## 6. Required approval phrase (sandbox execution only)

Future sandbox provider execution **only** if all of:

1. Evidence minimum **ACCEPTED**
2. Risk register reviewed — no **Critical** OPEN without waiver ID
3. Operator signs phrase:

`APPROVE CORE02 SANDBOX PROVIDER DRILL ONLY — <DR-ID> — <operator> — <date>`

**Phrases that do NOT authorize execution:** “start”, “go ahead”, “شروع کن”, “run tests”, “try Reloadly”.

---

## 7. Abort and rollback

| Trigger | Action |
|---------|--------|
| Wrong environment (prod host) | **ABORT** — rotate creds per ops |
| User-visible false deliver | **ABORT** corridor — IR |
| Evidence leak (secrets/PII) | **ABORT** — retract manifest |
| Approver revokes DR | **ABORT** — no further API calls |

---

## 8. Explicit NO-GO default

| Item | Status |
|------|--------|
| Provider ready | **NOT CLAIMED** |
| Fix proven | **NOT CLAIMED** |
| Production ready | **NO-GO** |
| Real-money ready | **NO-GO** |
| Controlled pilot ready | **NO-GO** |

---

## 9. Sign-off

| Role | Name | Date | Approve? |
|------|------|------|----------|
| Engineering | | | ☐ NO |
| Operations | | | ☐ NO |
| Program / owner | | | ☐ NO |

---

*End of decision record template.*
