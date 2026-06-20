# L-85M-R5-R1 — Next gate recommendation

**Gate UTC:** 2026-06-20

---

## Blocker

**`R5_R1_BLOCKED_TOKEN_NOT_AVAILABLE`** in agent execution subprocess.

## Retry path (separate authorization)

Execute authenticated GET **in the same PowerShell session** where `$env:OPS_HEALTH_TOKEN` is set:

1. Do **not** paste token into chat or evidence.
2. Run allowlisted capture script inline in that session.
3. File **L-85M-R5-R2** or re-run R5-R1 with subprocess that inherits Process env.

Alternative: operator runs proof script locally in token-bearing session; agent files evidence from allowlisted output fields only (no headers, no token).

## Unchanged

| Item | Status |
|------|--------|
| PR #5 | **KEEP_OPEN_BLOCKED** |
| L-85M structural (R4) | **PASS** |

---

*End.*
