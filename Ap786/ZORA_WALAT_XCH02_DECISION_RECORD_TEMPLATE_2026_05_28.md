# XCH-02 Decision Record Template

**Date:** 2026-05-28
**Default status:** **NO-GO / NOT APPROVED**

---

## 1. Decision metadata

| Field | Value |
|-------|-------|
| Decision ID | _XCH02-DR-_____ |
| Decision owner | _TBD_ |
| Contract suite version | _e.g. 1.0_ |
| Selected provider class | _FX \| PAYOUT \| KYC \| AML \| RECON \| NONE_ |
| Implementation approval state | **NOT APPROVED** (default) |

---

## 2. Review status

| Review | Owner | Status |
|--------|-------|--------|
| Legal / compliance | _Counsel_ | **NOT OBTAINED** |
| Engineering | _Eng lead_ | **NOT OBTAINED** |
| Security / privacy | _Security_ | **NOT OBTAINED** |

---

## 3. Contract acceptance checklist

| Contract | Accepted? |
|----------|-----------|
| [FX provider contract](./ZORA_WALAT_XCH02_FX_PROVIDER_CONTRACT_2026_05_28.md) | ☐ NO |
| [Payout provider contract](./ZORA_WALAT_XCH02_PAYOUT_PROVIDER_CONTRACT_2026_05_28.md) | ☐ NO |
| [Identity KYC/KYB contract](./ZORA_WALAT_XCH02_IDENTITY_KYC_KYB_PROVIDER_CONTRACT_2026_05_28.md) | ☐ NO |
| [AML/sanctions contract](./ZORA_WALAT_XCH02_AML_SANCTIONS_SCREENING_CONTRACT_2026_05_28.md) | ☐ NO |
| [Reconciliation contract](./ZORA_WALAT_XCH02_RECONCILIATION_AND_AUDIT_CONTRACT_2026_05_28.md) | ☐ NO |
| [Failure/failover model](./ZORA_WALAT_XCH02_PROVIDER_FAILURE_AND_FAILOVER_MODEL_2026_05_28.md) | ☐ NO |

---

## 4. Rollback boundary

| Trigger | Action |
|---------|--------|
| Contract rejected | Supersede with new version; no adapter deploy |
| Adapter sandbox failure | Destroy sandbox credentials |
| Compliance objection | **Immediate NO-GO** |

Docs-only rollback: revert Ap786 contract docs via git; **no production impact**.

---

## 5. Launch boundary

| Item | Default |
|------|---------|
| Sandbox adapter build | **NOT AUTHORIZED** |
| Production adapter | **NOT AUTHORIZED** |
| Real-money traffic | **NO** |
| Launch | **NO-GO** |

---

## 6. Explicit NO-GO default

Until this record shows **APPROVED** with explicit scope:

| Item | Status |
|------|--------|
| Contract implementation | **NO-GO** |
| Provider integration | **NO-GO** |
| Licensed / compliant / production-ready | **NOT CLAIMED** |

---

*XCH-02 decision template — no approval issued*
