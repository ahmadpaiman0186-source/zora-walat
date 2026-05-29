# CORE-08 Dry-Run Repair Plan Schema

**Date:** 2026-05-29

---

## RepairPlan fields

| Field | Type | Rule |
|-------|------|------|
| `planId` | string | Stable id e.g. `CORE8-PLAN-MISSING_AUDIT_METADATA-001` |
| `sourceFindingId` | string | Doctor/idempotency/NPNS code or signal id |
| `invariantIds` | string[] | INV-01..07 |
| `repairClass` | enum | A / B / C / D (see classification doc) |
| `severity` | enum | critical \| high \| medium \| low \| info |
| `affectedEntityIds` | object | orderId, walletId, etc. |
| `evidence` | object | Sanitized context |
| `recommendedAction` | string | Never auto-executed |
| `approvalRequired` | boolean | true for Class C |
| `rollbackPlan` | string | Human-readable rollback description |
| `mutationAllowed` | boolean | **always false** |
| `applyAvailable` | boolean | **always false** |
| `evidenceRequiredBeforeApply` | string[] | Gate list for future apply |
| `operatorApprovalPhrase` | string? | Present when `approvalRequired` |

---

## DryRunRepairReport

| Field | Value |
|-------|-------|
| `mode` | `dry_run_only` |
| `dryRunOnly` | `true` |
| `autoRepairApplyEnabled` | `false` |
| `plans` | `RepairPlan[]` |
| `verdict` | PASS \| WARN \| FAIL |
| `safety.apply_available` | `false` |

---

## Input bundle (`DryRunPlannerInput`)

```json
{
  "findings": [],
  "idempotencyDecisions": [],
  "deliveryDecisions": [],
  "signals": []
}
```

Planner shallow-copies inputs; does not mutate source objects in place beyond copy.

---

*End of schema.*
