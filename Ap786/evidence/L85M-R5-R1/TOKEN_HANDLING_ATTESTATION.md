# L-85M-R5-R1 — Token handling attestation

**Gate UTC:** 2026-06-20

---

## Operator session

| Field | Result |
|-------|--------|
| `$env:OPS_HEALTH_TOKEN` in operator PowerShell Process | **SET** (operator attested) |
| Authenticated GET executed | **YES** |
| Auth outcome | **REJECTED** — **401** both variants |

## Non-occurrence

| Action | Performed |
|--------|-----------|
| Token printed/echoed/logged | **NO** |
| Token in evidence/commit | **NO** |
| Request headers stored | **NO** |
| Raw full response stored | **NO** |
| Cookies stored | **NO** |
| User asked to paste token | **NO** |

Evidence filed from allowlisted safe fields only.

---

*End.*
