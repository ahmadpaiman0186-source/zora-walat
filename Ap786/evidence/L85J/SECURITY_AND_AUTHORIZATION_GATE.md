# L-85J — Security and authorization gate

Documents **separate explicit operator authorization** required before any mutation or proof activity beyond this design gate.

**L-85J authorization to implement or mutate: DENIED.**

---

## 1) Fail-closed security posture (future endpoint)

| Control | Requirement |
|---------|-------------|
| Token auth | `OPS_HEALTH_TOKEN` required — missing → block |
| Token validation | Invalid token → block — no DB work |
| Read-only URL | `READ_ONLY_DATABASE_URL` required — missing → `BLOCKED` — **no owner fallback** |
| Owner isolation | Never use `DATABASE_URL` or `server/src/db.js` prisma for this proof |
| Data minimization | Boolean flags only in HTTP response |
| Error redaction | No raw SQL errors, no connection metadata in response or logs |
| Row export | Forbidden — `no_rows_exported: true` invariant |
| Write probes | Forbidden — privilege metadata only |
| Tier guard | Staging-only recommended for first proof (`zora-walat-api-staging`) |

---

## 2) Mutations requiring separate future gate + operator approval

Each row requires its **own** Ap786 gate ID and explicit operator approval phrase — not bundled.

| # | Mutation class | Authorization required |
|---|----------------|------------------------|
| 1 | Adding runtime code (route, handler, client module) | **YES** |
| 2 | Adding npm dependency (e.g. `pg`) | **YES** |
| 3 | Creating the live endpoint | **YES** |
| 4 | Setting Vercel `READ_ONLY_DATABASE_URL` on staging | **YES** |
| 5 | Setting or rotating runtime `OPS_HEALTH_TOKEN` | **YES** |
| 6 | Deploy or redeploy to any Vercel project | **YES** |
| 7 | Calling the live endpoint (HTTP proof) | **YES** |
| 8 | Filing runtime evidence as PASS | **YES** |
| 9 | Using any Vercel project as runtime proof target | **YES** — project name must be attested |
| 10 | Claiming runtime DB identity proof | **YES** — only after successful controlled HTTP gate |

---

## 3) Authorization checklist (future operator gate)

Before items in §2:

- [ ] New gate ID assigned (post L-85J)
- [ ] Scope document lists exact files and env keys by **name only**
- [ ] Production project **`zora-walat-api`** excluded unless separately scoped
- [ ] Rollback plan: remove env var, revert deploy, disable route flag
- [ ] `secrets:scan` planned after any code commit
- [ ] Evidence plan: branch, commit, diff, deploy ID, redacted HTTP response flags only
- [ ] NON_CLAIMS filed in same gate
- [ ] No Stripe/payment/provider env changes in same gate unless explicitly scoped

---

## 4) Token and env handling rules (future implementation)

| Rule | Detail |
|------|--------|
| Never log `READ_ONLY_DATABASE_URL` | Load once; compare presence only in evidence |
| Never log `OPS_HEALTH_TOKEN` | Compare via constant-time match only |
| Never return env values | Structural booleans only |
| Clipboard / screenshots | Operator hygiene per L-85H pattern |
| Wrong-field paste | Block save if Stripe-like pattern in token field (L-84R lesson) |

---

## 5) Vercel target authorization

| Target | First proof binding |
|--------|---------------------|
| **`zora-walat-api-staging`** | **INFERRED** — requires operator confirmation in future gate |
| **`zora-walat-api` (production)** | **Forbidden** for initial read-only proof |
| Root frontend project | **Forbidden** — wrong runtime graph |

Using **any** Vercel project as runtime target requires explicit naming in operator authorization record — not assumed from L-85J design.

---

## 6) L-85J actions taken

| Action | Performed |
|--------|-----------|
| Runtime code added | **NO** |
| Dependency added | **NO** |
| Endpoint created/called | **NO** |
| Vercel env mutated | **NO** |
| Deploy | **NO** |
| DB connect | **NO** |
| Stripe/payment/provider config mutated | **NO** |

---

*End.*
