# L-84B — Local token handling protocol (future)

**Ap786 protocol only.** No token values in this document.

## Local variable

| Name | Purpose |
|------|---------|
| `ZW_OPS_HEALTH_TOKEN` | Operator-local only; used as `X-ZW-Ops-Token` header value for authorized staging POST |

## Rules

1. Operator sets `$env:ZW_OPS_HEALTH_TOKEN` in local shell **before** POST — never in repo, never in Ap786 evidence.
2. Token must match staging `OPS_HEALTH_TOKEN` (same logical secret; different env var names by convention).
3. **Do not paste token into command history visible in evidence** — use env var reference only.
4. **Do not commit** `.env`, `.env.local`, or any file containing token values.
5. **Do not print** token in terminal output, logs, screenshots, or chat transcripts filed in Ap786.

## PowerShell pattern (future L-84 retry)

```powershell
$ErrorActionPreference = "Stop"
if (-not $env:ZW_OPS_HEALTH_TOKEN) { throw "Missing local ZW_OPS_HEALTH_TOKEN" }
$headers = @{ "X-ZW-Ops-Token" = $env:ZW_OPS_HEALTH_TOKEN }
# POST uses $headers only — token not in URI or body
```

## Verification without disclosure

| Check | Method |
|-------|--------|
| Local token set | `if ($env:ZW_OPS_HEALTH_TOKEN) { "SET" } else { "NOT SET" }` — **no length/value logging in Ap786** |
| Staging token present | Vercel env list shows `OPS_HEALTH_TOKEN` name with Encrypted value — **name only in evidence** |
| Match | Successful 200 from probe route (future) — **do not log token on failure** |

## L-84B gate scope

Protocol documented only. **No local token set or searched in this gate.**

---

*End.*
