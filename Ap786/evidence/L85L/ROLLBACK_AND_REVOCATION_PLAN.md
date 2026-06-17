# L-85L — Rollback and revocation plan

**Status:** PLAN ONLY — no rollback executed in L-85L (no env mutation occurred).

---

## 1) Rollback triggers (future)

| Trigger | Response |
|---------|----------|
| `GET /ops/db-readonly-proof` returns `FAIL` | Investigate; consider rollback |
| `verdict: BLOCKED` after bind (unexpected) | Check deploy + env scope |
| Wrong Vercel project targeted | **Immediate rollback** |
| Wrong environment (production) | **Immediate rollback** |
| Credential exposure suspected | Rotate read-only role + remove env |
| Operator abort mid-gate | Discard unsaved changes; clear clipboard |

---

## 2) Rollback actions (future L-85M)

| Step | Action |
|------|--------|
| R1 | Remove or unset `READ_ONLY_DATABASE_URL` from **incorrect** or **completed-test** Vercel target |
| R2 | Redeploy staging API **only if** required to clear runtime binding — authorized separately |
| R3 | File rollback evidence (structural — no secret values) |
| R4 | Re-run `secrets:scan` on any repo changes |

---

## 3) Credential revocation (future)

| Condition | Action |
|-----------|----------|
| Read-only URL exposed (screenshot, chat, log) | Neon password reset for role `zora_walat_readonly_audit` — separate hygiene gate |
| Token exposed in wrong Vercel field | Clean `OPS_HEALTH_TOKEN` rotation — separate gate (L-84R pattern) |
| Uncertain exposure | Assume exposure — rotate before re-bind |

**Do not** rotate owner `DATABASE_URL` unless separately scoped gate.

---

## 4) Forbidden rollback side effects

| Action | Status |
|--------|--------|
| Change owner `DATABASE_URL` | **FORBIDDEN** in read-only proof rollback |
| Change Stripe env keys | **FORBIDDEN** |
| Change payment/provider env keys | **FORBIDDEN** |
| Production deploy for rollback | **FORBIDDEN** unless explicitly scoped |

---

## 5) Disable-without-delete option

If proof succeeds but ongoing binding not needed:

| Option | When |
|--------|------|
| Remove `READ_ONLY_DATABASE_URL` from Vercel | Endpoint returns `BLOCKED` / `readonly_url_missing` — safe fail-closed |
| Keep binding for audit cadence | Requires periodic re-proof authorization |

---

## 6) Verdict rules after rollback

| Situation | Claim allowed |
|-----------|---------------|
| Rollback due to proof failure | **NO PASS** for runtime read-only proof |
| Rollback due to wrong target | **NO PASS** — file incident evidence |
| Rollback after successful proof (cleanup) | Prior PASS stands **only if** proof evidence already filed unchanged |

---

## 7) L-85L status

| Action | Performed |
|--------|-----------|
| Rollback executed | **NO** |
| Env binding existed to remove | **NO** |

---

*End.*
