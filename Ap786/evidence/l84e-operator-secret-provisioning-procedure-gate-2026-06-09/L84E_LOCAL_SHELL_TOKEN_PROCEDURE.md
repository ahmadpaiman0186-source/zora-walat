# L-84E — Local shell token procedure

**Future operator procedure — not executed in L-84E gate.**

## Local variable

| Name | Purpose |
|------|---------|
| `ZW_OPS_HEALTH_TOKEN` | Operator-local mirror of staging `OPS_HEALTH_TOKEN` for authorized future POST |

## Rules

1. Set **after** staging `OPS_HEALTH_TOKEN` is present on **`zora-walat-api-staging`**.
2. Value must **match** staging token logically.
3. **Never** print value in terminal, chat, logs, or evidence.
4. **Never** commit to repo or paste into command history filed in Ap786.
5. Session-only or secure operator vault — not shared in git.

## PowerShell (future operator session)

Set locally (operator performs — value not shown in procedure docs):

```powershell
# Operator sets locally — do not record value in Ap786
$env:ZW_OPS_HEALTH_TOKEN = '<operator-supplied-matching-token>'
```

## Safe check only (allowed in evidence)

```powershell
if ($env:ZW_OPS_HEALTH_TOKEN) { "ZW_OPS_HEALTH_TOKEN: SET (value hidden)" } else { "ZW_OPS_HEALTH_TOKEN: NOT SET" }
```

## L-84E boundary

**No local token set in this gate.** Current state per L-84D: **NOT SET**.

---

*End.*
