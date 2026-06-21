# L-85M-R5-R4A — Next fix recommendation

**Gate UTC:** 2026-06-21

---

## Recommended follow-on gates (separate authorization each)

| Gate | Purpose |
|------|---------|
| **L-85M-R5-R4B** | Read-only Vercel function log investigation around **`2026-06-21T07:58:15Z`** / deployment for merge **`a83ae84`** — identify pass-through exception class (no token use) |
| **L-85M-R5-R4F** | Authorized surgical fix after logs or static analysis — candidates below |
| **L-85M-R5-R4 retry** | Only after fix + active `$env:OPS_HEALTH_TOKEN` session (or re-alignment gate) |

## Static fix candidates (for R5-R4F scoping — not applied here)

1. **Import `registerServerlessRuntime.js` before bootstrap** in `api/ops/db-readonly-proof.mjs` (parity with `server/api/index.mjs`).
2. **Narrow pass-through** — optional slim handler that mounts only ops proof route instead of full `createValidatedApp()` graph (larger change; needs explicit authorization).
3. **Sanitized internal error logging** on bridge catch (class/message hash only — no secrets) to support future log correlation.

## Out of scope for this gate

- Code changes
- Deploy / redeploy
- Endpoint retry
- Token use
- PR open / merge

---

*End.*
