# CORE-08 Approval and Apply Boundary

**Date:** 2026-05-29

---

## v1 boundary

| Capability | Status |
|------------|--------|
| Dry-run plan generation | **ENABLED** (local/fixture) |
| `applyAvailable` flag on plans | **always false** |
| `mutationAllowed` on plans | **always false** |
| CLI `--apply` | **REJECTED** (exit 2) |
| Auto-repair apply | **NOT ENABLED** |
| DB write from CORE-08 | **NO** |
| External API from CORE-08 | **NO** |
| Provider retry from CORE-08 | **NO** |
| Refund execution from CORE-08 | **NO** |

---

## Not wired

- `paymentController`, webhooks, Reloadly client, order lifecycle, wallet routes  
- `moneyPathDriftRepair.js` (existing code unchanged)

---

## Future apply workflow (outside CORE-08 v1)

Requires **all**:

1. Class C or approved Class B DR  
2. Phrase: `APPROVE CORE-08 SAFE REPAIR APPLY ONLY`  
3. `evidenceRequiredBeforeApply` satisfied  
4. Separate implementation PR — not CORE-08  

---

## Integration inputs

| Source | Consumed as |
|--------|-------------|
| CORE-04 findings | `signalFromDoctorFinding` |
| CORE-05 decisions | `signalFromIdempotencyDecision` |
| CORE-06 decisions | `signalFromDeliveryDecision` |
| Explicit `signals[]` | Direct classify |

---

*End of boundary.*
