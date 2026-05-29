# CORE-04 Detect-Only Runtime Doctor

**Date:** 2026-05-29  
**Status:** **IMPLEMENTED (detect-only v1)**  
**Parent:** [CORE-03 reliability kernel](./ZORA_WALAT_CORE03_SUPER_SYSTEM_RELIABILITY_KERNEL_2026_05_29.md)

---

## 1. What was implemented

| Component | Location | Mutates? |
|-----------|----------|----------|
| Finding schema + scan orchestrator | `server/src/reliability/runtimeDoctor/` | **NO** |
| Eight pure scanners | `server/src/reliability/runtimeDoctor/scanners/` | **NO** |
| Unit tests + fixtures | `server/test/runtimeDoctorDetectOnly.test.js` | **NO** |
| CLI mode `reliability` | `server/tools/zw-doctor.mjs` + `zwDoctor/reliabilityMode.mjs` | **NO** (fixture JSON only) |

---

## 2. Diagnostic finding schema

| Field | Purpose |
|-------|---------|
| `id` | Stable finding id |
| `fmId` | CORE-03 failure mode |
| `invariantIds` | INV-01..07 |
| `severity` | critical / high / medium / low / info |
| `repairClass` | A / B / C / D |
| `recommendation` | Action code (not executed) |
| `mutationAllowed` | **Always `false`** in v1 |
| `entityType` / `entityId` | Affected entity (sanitized) |
| `evidence` | Structured context |

---

## 3. Scanners (invariant framework)

| Scanner | FM coverage |
|---------|-------------|
| `duplicate_transaction` | FM-04, FM-05, FM-06 |
| `no_pay_no_service` | FM-01, FM-10, FM-11 |
| `provider_proof` | FM-08 |
| `stale_pending` | FM-07 |
| `payment_order_provider_mismatch` | FM-02, FM-12 |
| `completed_without_proof` | FM-09 |
| `missing_audit` | FM-13 |
| `ambiguous_provider` | FM-03 |

Input: **in-memory snapshot** (`ReliabilityScanSnapshot`) — no database driver in v1.

---

## 4. Repair classes (recommendation only)

| Class | Meaning | Applied? |
|-------|---------|------------|
| **A** | Read-only detection | **NO** |
| **B** | Metadata repair candidate | **NO** |
| **C** | Approval-required money/provider repair candidate | **NO** |
| **D** | Forbidden auto-repair | **NO** |

---

## 5. CLI usage (fixture-only)

```bash
cd server
npm run test:runtime-doctor
node tools/zw-doctor.mjs reliability --fixture test/fixtures/runtimeDoctor/sample-unhealthy.json
node tools/zw-doctor.mjs reliability --fixture test/fixtures/runtimeDoctor/sample-unhealthy.json --json --strict
```

`--apply` → **exit 2** (hard reject).

Without `--fixture` → exit 2 with hint (no live DB scan in v1).

---

## 6. Explicit non-goals (v1)

- No PostgreSQL / Redis reads in default CLI path  
- No Stripe / Reloadly / Vercel calls  
- No payment, wallet, order, or provider mutations  
- No auto-repair apply  
- No production endpoint  

---

## 7. Claim boundary

| Claim | Status |
|-------|--------|
| CORE-04 detect-only doctor **exists** | **YES** (code + local tests) |
| Production reliability **proven** | **NOT CLAIMED** |
| Provider / pilot / launch ready | **NO-GO** |

---

*See also: [Safety boundary](./ZORA_WALAT_CORE04_DETECT_ONLY_SAFETY_BOUNDARY_2026_05_29.md), [Test evidence](./ZORA_WALAT_CORE04_RUNTIME_DOCTOR_TEST_EVIDENCE_2026_05_29.md), [Verdict](./ZORA_WALAT_CORE04_CONSERVATIVE_VERDICT_2026_05_29.md).*
