# L-84F — Local token set confirmation rules

**Verdict:** `CORE10-L84F-VERDICT-001: L84F_OPERATOR_SECRET_PROVISIONING_EXECUTION_AUTHORIZATION_GATE_ONLY`

## G. Local token confirmation rule (future safe check only)

After a **future** approved execution sets `ZW_OPS_HEALTH_TOKEN`, the **only** permitted local confirmation command pattern:

```powershell
if ($env:ZW_OPS_HEALTH_TOKEN) { "ZW_OPS_HEALTH_TOKEN: SET (value hidden)" } else { "ZW_OPS_HEALTH_TOKEN: NOT SET" }
```

## Forbidden local checks

| Action | Status |
|--------|--------|
| `echo $env:ZW_OPS_HEALTH_TOKEN` | **FORBIDDEN** |
| `Write-Output $env:ZW_OPS_HEALTH_TOKEN` | **FORBIDDEN** |
| `Get-ChildItem Env:ZW_OPS_HEALTH_TOKEN` showing value | **FORBIDDEN** |
| Any command that prints the actual value | **FORBIDDEN** |
| Exporting token to a file | **FORBIDDEN** |

## Current state (L-84F filing)

| Check | Result |
|-------|--------|
| `ZW_OPS_HEALTH_TOKEN` | **NOT SET** (per L-84D / L-84E; not changed in L-84F) |

L-84F does **not** run confirmation commands against a live token — rules only.

---

*End.*
