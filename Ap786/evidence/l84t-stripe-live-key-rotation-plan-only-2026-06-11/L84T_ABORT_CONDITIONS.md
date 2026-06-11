# L-84T — Abort conditions

**Verdict:** `CORE10-L84T-VERDICT-001: L84T_STRIPE_ROTATION_PLAN_ONLY_EXECUTION_NOT_AUTHORIZED`

## Immediate STOP — do not save, do not deploy

| Condition | Action |
|-----------|--------|
| **`sk_live...`-like** pattern appears in **`OPS_HEALTH_TOKEN`** edit field | **STOP** — exit without saving; clear clipboard |
| Stripe key pasted into wrong Vercel env var | **STOP** — discard unsaved edit |
| Operator unsure of target project | **STOP** — re-read target lock ([L-84J](../../ZORA_WALAT_L84J_STRIPE_KEY_ROTATION_EXECUTION_PREFLIGHT_TARGET_LOCK_2026_06_09.md)) |
| Authorization phrase missing for execution gate | **STOP** — plan-only does not authorize action |
| Secret value about to be pasted into chat/evidence | **STOP** |
| Vercel reveal/eye clicked unnecessarily | **STOP** — close without recording value |

## Abort evidence (future gates)

When STOP triggered during execution, file **blocked/aborted** verdict evidence:

| Field | Record |
|-------|--------|
| Gate ID | e.g. L-84U, L-84V (future) |
| Abort reason | Pattern label / wrong field / no authorization — **no secret value** |
| Vercel save today | **NO** |
| Clipboard cleared | **YES** (required) |
| Local token discarded | **YES** (if generated) |
| Redeploy | **NO** |
| HTTP | **NO** |

## Rollback considerations (plan only)

| Scenario | Planned response |
|----------|------------------|
| Stripe key rolled but Vercel not updated | Restore service by updating Vercel Stripe env var with **new** key — operator Dashboard; separate gate |
| OPS token saved but wrong value class | Replace with new CSPRNG ops token — new recovery gate; redeploy after save |
| Redeploy before env save | **Do not redeploy** until env save confirmed — sequencing error |

## L-84R / L-84S precedent

L-84R aborted when **`sk_live...`-like** pattern observed — **exited without saving**. L-84S triaged read-only. Future execution must include same fail-closed abort path.

---

*End.*
