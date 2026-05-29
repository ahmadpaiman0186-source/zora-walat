# CORE-04 Runtime Doctor Test Evidence

**Date:** 2026-05-29  
**Command:** `npm run test:runtime-doctor` (from `server/`)  
**Scope:** Pure unit tests only — no DB, no env, no external APIs

---

## 1. Test file

`server/test/runtimeDoctorDetectOnly.test.js`

---

## 2. Fixture cases (required a–h)

| Case | Fixture module | Expected signal |
|------|----------------|-----------------|
| a. Paid, provider missing | `paidNoProviderAttempts` | `CORE4-NPNS-001` |
| b. Provider success, order not complete | `providerSuccessOrderProcessing` | `CORE4-MIS-001` |
| c. Fulfilled without provider ref | `fulfilledNoReference` | `CORE4-PRV-PRF-001` |
| d. Duplicate provider reference | `duplicateProviderReference` | `CORE4-DUP-PRV-001` |
| e. Stale pending | `stalePendingOrder` | `CORE4-STALE-001` |
| f. Ambiguous provider | `ambiguousOnFulfilled` | `CORE4-AMB-001` |
| g. Missing audit | `missingAudit` | `CORE4-AUD-001` |
| h. Healthy | `healthyOrder` | verdict **PASS**, 0 critical/high |

Static JSON for CLI: `server/test/fixtures/runtimeDoctor/sample-unhealthy.json`

---

## 3. Runtime proof boundary

| Proof type | Status |
|------------|--------|
| Local unit tests | **Run in validation** (see CI log below) |
| Staging DB scan | **NOT EXECUTED** |
| Production scan | **NOT EXECUTED** |
| E2E money path | **NOT VERIFIED** |

---

## 4. Evidence record

| Field | Value |
|-------|-------|
| Test command | `npm run test:runtime-doctor` |
| Test file count | 1 |
| External calls | None |
| Auto-repair apply | Not tested (not enabled) |

**Validation run (2026-05-29):**

```
npm run test:runtime-doctor
# tests 11 | pass 11 | fail 0 | duration_ms ~271
```

CLI smoke (fixture only):

```
node tools/zw-doctor.mjs reliability --fixture test/fixtures/runtimeDoctor/sample-unhealthy.json --json
# verdict FAIL | findings: CORE4-NPNS-001, CORE4-AUD-001 | exit 0 (non-strict)
```

---

*End of test evidence template.*
