# L-85M-R5-R1 — Token handling attestation

**Gate UTC:** 2026-06-20

---

## Check

| Field | Result |
|-------|--------|
| `$env:OPS_HEALTH_TOKEN` in gate subprocess | **NOT SET** |
| Outcome | `R5_R1_BLOCKED_TOKEN_NOT_AVAILABLE` |

## Non-occurrence

| Action | Performed |
|--------|-----------|
| Token printed/echoed/logged | **NO** |
| Token in evidence/commit | **NO** |
| Request headers stored | **NO** |
| User asked to paste token | **NO** |

## Note

Operator attested token present in interactive PowerShell Process; gate automation subprocess did not receive it. Retry requires execution in the **same shell session** where `$env:OPS_HEALTH_TOKEN` is set, without exposing token to chat or files.

---

*End.*
