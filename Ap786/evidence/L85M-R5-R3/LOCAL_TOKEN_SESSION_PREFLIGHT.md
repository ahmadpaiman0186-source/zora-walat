# L-85M-R5-R3 — Local token session preflight

**Gate UTC:** 2026-06-20

---

## Preflight command (shape only — no token value)

```powershell
if ([string]::IsNullOrWhiteSpace($env:OPS_HEALTH_TOKEN)) { "OPS_TOKEN_LOCAL_PROCESS_PRESENT=NO" }
elseif ($env:OPS_HEALTH_TOKEN -match '^[0-9a-fA-F]{64}$') { "OPS_TOKEN_LOCAL_PROCESS_PRESENT=YES_SHAPE_OK" }
else { "OPS_TOKEN_LOCAL_PROCESS_PRESENT=YES_SHAPE_BAD" }
```

## Result

| Field | Value |
|-------|--------|
| `OPS_TOKEN_LOCAL_PROCESS_PRESENT` | **YES_SHAPE_OK** |
| Endpoint call permitted | **YES** |
| Token printed | **NO** |

## Context

Process-scoped token retained from **L-85M-R5T-R2** alignment gate execution session (session-bound; value not recorded).

---

*End.*
