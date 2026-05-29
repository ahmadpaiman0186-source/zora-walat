# CORE-08 Safe Repair Dry-Run Engine

**Date:** 2026-05-29  
**Status:** **IMPLEMENTED (dry-run only)**  
**Default:** **apply NOT ENABLED** · production / real-money / pilot / launch **NO-GO**

---

## Purpose

Consume **CORE-04** findings, **CORE-05** idempotency decisions, **CORE-06** delivery decisions, and explicit repair signals; produce **repair plans only** — detect → classify → propose → require approval where needed.

**No apply path.** No mutation. No external I/O.

---

## Module

```
server/src/reliability/safeRepairDryRun/
  types.js       — RepairPlan schema
  signals.js     — normalize doctor/idempotency/NPNS inputs
  classify.js    — repair class A/B/C/D mapping
  planDryRun.js  — planSafeRepairDryRun (pure)
  index.js
```

---

## Workflow

```
Detect (CORE-04/05/06) → Classify repair (CORE-08) → Dry-run plan → [STOP — no apply]
                              ↓
                    approval phrase if Class C
```

---

## CLI (fixture-only)

```bash
cd server
node tools/zw-doctor.mjs repair-dry-run --fixture test/fixtures/safeRepairDryRun/sample-plans.json --json
```

`--apply` → **exit 2** (forbidden).

---

## Tests

```bash
npm run test:safe-repair-dry-run
```

---

## Conservative verdict

| Item | Status |
|------|--------|
| Dry-run engine | **IMPLEMENTED** |
| Repair apply | **NOT ENABLED** |
| Live repair execution | **NO** |
| Production readiness | **NO-GO** |

Detail: [Conservative verdict](./ZORA_WALAT_CORE08_CONSERVATIVE_VERDICT_2026_05_29.md).

---

*End of engine doc.*
