# L-85P — Security review

---

## Threat model (scoped)

Unauthenticated or wrongly authenticated callers hitting `GET /ops/db-readonly-proof` during serverless cold start must not trigger heavy bootstrap, DB client init, or secret leakage.

## Controls

| Control | Implementation |
|---------|----------------|
| Fail closed | Missing/invalid token → `401 BLOCKED` before bootstrap |
| OPS token source | `process.env.OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` only (no `env.js`, no `DATABASE_URL`) |
| Constant-time compare | `timingSafeEqualUtf8` for presented vs configured token |
| No token logging | Guard does not log header values |
| No secret in response | Blocked body is structural flags only |
| No owner DB fallback | Guard never reads `process.env.DATABASE_URL` |
| No DB on blocked path | Handler returns before `passThrough` / `getHandler()` |

## Valid-token pass-through

Only after token validation and readonly URL **presence** check. Actual DB proof remains in L-85K service layer; not invoked in L-85P evidence or live proof.

## Secret disclosure

| Item | Occurred |
|------|----------|
| Secret printed in logs/output | **NO** |
| Secret in committed files | **NO** (`secrets:scan` OK) |
| `.env.local` read | **NO** |

---

*End.*
