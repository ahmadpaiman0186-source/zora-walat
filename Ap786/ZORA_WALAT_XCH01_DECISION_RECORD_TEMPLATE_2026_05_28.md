# XCH-01 Decision Record Template

**Date:** 2026-05-28
**Default status:** **NO-GO / NOT APPROVED / NOT EXECUTED**

---

## 1. Decision summary

| Field | Value |
|-------|-------|
| Decision ID | _XCH01-DR-_____ |
| Related pack | XCH-01 Exchange Infrastructure Execution Gate |
| Corridor(s) affected | _e.g. US→AF — or NONE_ |
| Approval status | **NOT APPROVED** (default) |
| Decision date | _PENDING_ |

---

## 2. Decision owner

| Role | Name (placeholder) | Sign-off |
|------|-------------------|----------|
| Program owner | _TBD_ | ☐ |
| Engineering lead | _TBD_ | ☐ |
| Compliance officer | _TBD_ | ☐ |
| Legal counsel | _TBD_ | ☐ |

---

## 3. Sign-offs required before any sandbox build

| Sign-off | Required for | Status |
|----------|--------------|--------|
| Legal / compliance | Any corridor-specific config | **NOT OBTAINED** |
| Engineering | Infrastructure spec acceptance (XCH1-G1…G3) | **NOT OBTAINED** |
| Security | If sandbox touches PII | **NOT OBTAINED** |

---

## 4. Scope of decision (check all that apply)

| Item | Approved? |
|------|-----------|
| Accept provider-neutral architecture spec | ☐ NO (default) |
| Accept quote/fee/tax engine spec | ☐ NO (default) |
| Accept ledger invariants | ☐ NO (default) |
| Accept compliance gate matrix | ☐ NO (default) |
| Authorize sandbox prototype (no customer funds) | ☐ NO (default) |
| Authorize real-money pilot | ☐ NO (default) |
| Authorize production launch | ☐ NO (default) |

---

## 5. Rollback plan

| Trigger | Action |
|---------|--------|
| Spec rejected or superseded | Archive XCH-01 decision; no code deploy |
| Sandbox prototype aborted | Destroy sandbox credentials; no prod impact |
| Compliance objection | **Immediate NO-GO** — halt all build |

No production rollback required for XCH-01 docs-only filing.

---

## 6. Launch boundary

| Boundary | Status |
|----------|--------|
| Maximum corridors approved | **NONE** |
| Maximum transaction value (pilot) | **N/A** |
| Customer funds allowed | **NO** |
| Live FX execution | **NO** |

---

## 7. Explicit NO-GO default

Until this record is completed with all required sign-offs and approval status changed to **APPROVED** with explicit scope:

| Item | Default |
|------|---------|
| Exchange infrastructure build | **NO-GO** |
| Real-money remittance | **NO-GO** |
| Production-ready claim | **FORBIDDEN** |
| Licensed / compliant claim | **FORBIDDEN** |

---

*XCH-01 decision template — no approval issued by default*
