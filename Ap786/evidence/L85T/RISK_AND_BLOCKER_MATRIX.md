# L-85T — Risk and blocker matrix

---

## Blocker tiers

| ID | Blocker | Tier | Status | Cleared by |
|----|---------|------|--------|------------|
| B1 | `READ_ONLY_DATABASE_URL` not proven on staging deploy | **HIGH** | **OPEN** | Operator bind + attestation gate |
| B2 | Authenticated runtime DB proof not performed | **HIGH** | **OPEN** | Authorized L-85M retry |
| B3 | `OPS_HEALTH_TOKEN` staging availability unverified | **HIGH** | **OPEN** | L-85M secure injection |
| B4 | Current readonly credential validity unproven | **MEDIUM** | **OPEN** | L-85M PASS or fresh local hygiene gate |
| B5 | Vercel project Root Directory still `.` per L-85O | **MEDIUM** | **MITIGATED** | L-85Q `server/` CLI deploy — re-verify each deploy |
| B6 | Legacy open PRs | **LOW** | **N/A** | Out of scope (L-85R/S) |

---

## Pass items (not blockers)

| ID | Item | Evidence |
|----|------|----------|
| P1 | Structural unauthenticated route | **PASS** — L-85Q |
| P2 | Proof endpoint code on `main` | **PASS** — L-85K |
| P3 | Pre-bootstrap guard | **PASS** — L-85P + L-85Q |
| P4 | Local unit/route tests | **PASS** — L-85T preflight |
| P5 | Read-only role local proof | **PASS** — L-85G (scoped) |
| P6 | No owner URL fallback in code | **PASS** — L-85K static/tests |

---

## L-85M GO / NO-GO

| Decision | Rationale |
|----------|-----------|
| **NO GO** | B1 + B2 + B3 open |
| **GO** (future) | All HIGH blockers cleared + explicit L-85M operator authorization |

---

## Risk if L-85M run prematurely

| Risk | Impact |
|------|--------|
| Proof against owner DB | **CRITICAL** — prevented by code if env wrong (readonly_url_missing) but wastes gate |
| False PASS claim | **HIGH** — violates global proof standard |
| Secret disclosure in evidence | **HIGH** — mitigated by redaction plan |
| Production customer impact | **LOW** if staging-only + no env mutation on prod |

---

*End.*
