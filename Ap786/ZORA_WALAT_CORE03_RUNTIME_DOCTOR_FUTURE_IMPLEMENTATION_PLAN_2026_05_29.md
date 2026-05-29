# CORE-03 Runtime Doctor Future Implementation Plan (CORE-04)

**Date:** 2026-05-29  
**Status:** **PLAN ONLY — NOT IMPLEMENTED**  
**Extends:** `server/tools/zw-doctor.mjs` (read-only modes exist today)

---

## 1. Objective

Deliver **CORE-04 Super-System Runtime Doctor** as **detect-only v1**: health checks, invariant scanners, and repair **recommendations** with **zero mutation**.

---

## 2. Non-goals (v1)

- No Stripe/Reloadly/Vercel API calls from doctor
- No automatic refunds, captures, provider POSTs, or order transitions
- No production readiness claim from doctor PASS
- No replacement for integration tests or operator drills

---

## 3. v1 capabilities

| Module | Function | Class |
|--------|----------|-------|
| `doctor health` | `/health`, `/ready`, DB `SELECT 1` | A |
| `doctor invariants` | INV-01..07 static rules on DB snapshot | A |
| `doctor stale-pending` | FM-07 PROCESSING/PENDING age | A |
| `doctor duplicate-tx` | FM-04..06, FM-12 patterns | A |
| `doctor provider-proof` | FM-08, FM-09 FULFILLED without ref | A |
| `doctor mismatch` | FM-01, FM-02, FM-10, FM-12 payment/fulfill | A |
| `doctor recommend` | Emit human-readable repair plan | A (recommend only) |

---

## 4. CLI shape (proposed)

```
zw-doctor reliability scan [--dry-run] [--json] [--since 24h]
zw-doctor reliability report [--output Ap786/evidence/...]
```

| Flag | Behavior |
|------|----------|
| `--dry-run` | **Default** — mandatory in v1 |
| `--apply` | **Disabled** — hard exit 2 if passed |
| `--json` | Machine findings for CI artifact |

---

## 5. Data access

| Store | Mode |
|-------|------|
| PostgreSQL | Read-only role / connection string from env (operator-provided) |
| Redis | Optional GET only for shadow keys count |
| Logs | Not ingested in v1 — pointer to operator |

---

## 6. Findings schema (draft)

```json
{
  "schemaVersion": 1,
  "scanAt": "ISO-8601",
  "findings": [
    {
      "id": "FM-07-001",
      "fmId": "FM-07",
      "severity": "high",
      "invariantIds": ["INV-02"],
      "repairClass": "A",
      "recommendation": "manual_processing_recovery",
      "orderIdSuffix": "…abc123"
    }
  ]
}
```

---

## 7. CI integration (future)

| Gate | When |
|------|------|
| `zw-doctor reliability scan --ci-static` | Optional job after unit tests |
| Fail build on **Critical** open finding | Only after baseline established |

**Not wired in CORE-03.**

---

## 8. Implementation phases

| Phase | Deliverable | Mutation |
|-------|-------------|----------|
| CORE-04a | Scanners A only + JSON report | None |
| CORE-04b | Ap786 evidence template auto-fill | None |
| CORE-04c | Class B dry-run metadata repair | Approval-gated |
| CORE-04d | Class C hooks | Separate DR program |

---

## 9. Acceptance criteria (v1)

| Criterion | Required |
|-----------|----------|
| `npm run zw-doctor` (or equivalent) exits 0 on clean staging | TBD |
| `--apply` always rejected | **YES** |
| No secrets in report output | **YES** |
| Findings map to FM-IDs in matrix | **YES** |

**v1 acceptance: NOT VERIFIED (not built).**

---

## 10. Conservative verdict

| Item | Status |
|------|--------|
| CORE-04 plan | **FILED** |
| Runtime doctor | **NOT IMPLEMENTED** |
| Provider proof | **NOT VERIFIED** |

---

*End of CORE-04 plan.*
