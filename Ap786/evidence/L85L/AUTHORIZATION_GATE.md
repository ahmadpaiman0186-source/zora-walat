# L-85L — Authorization gate

**Status:** Runtime env mutation is **BLOCKED** until explicit operator authorization is recorded in a future gate (planned: **L-85M**).

L-85L performs **no mutation** and grants **no authorization**.

---

## 1) Gate verdict

| Action | L-85L authorization |
|--------|---------------------|
| Set Vercel `READ_ONLY_DATABASE_URL` | **DENIED** |
| Deploy / redeploy | **DENIED** |
| Call live `GET /ops/db-readonly-proof` | **DENIED** |
| Claim runtime DB identity proof | **DENIED** |

---

## 2) Future operator authorization checklist (L-85M+)

Before any runtime env mutation or live HTTP proof, operator must **explicitly confirm** each item in a signed attestation record (names/structure only — no secret values):

### Vercel account and project

- [ ] Correct Vercel **account** selected (operator attestation — not repo-proven in L-85L)
- [ ] Correct Vercel **project** selected
- [ ] Target **project name** recorded (expected first candidate: **`zora-walat-api-staging`** — **INFERRED**)
- [ ] Target **environment** recorded: staging / preview / production (first binding: **staging only** unless separately scoped)
- [ ] Project **root directory** confirmed (expected: `server/` for API — operator/Vercel UI evidence in L-85M)

### Env key scope (exact)

- [ ] Exact env key name: **`READ_ONLY_DATABASE_URL`** only
- [ ] **`DATABASE_URL` will NOT be changed** (owner connection preserved)
- [ ] **No Stripe env keys** will be changed
- [ ] **No payment/provider env keys** will be changed
- [ ] **No other env keys** will be changed in the same gate

### Impact and safety

- [ ] **No production customer impact** intended (staging-first binding)
- [ ] **No owner role replacement** — read-only URL is additive only
- [ ] Rollback plan reviewed ([ROLLBACK_AND_REVOCATION_PLAN.md](./ROLLBACK_AND_REVOCATION_PLAN.md))

### Execution authorizations (separate explicit phrases)

- [ ] **Deploy/redeploy authorization** — if env change requires redeploy to take effect
- [ ] **Live endpoint call authorization** — `GET /ops/db-readonly-proof` with `OPS_HEALTH_TOKEN`
- [ ] **Evidence capture authorization** — structural/boolean HTTP response flags only
- [ ] **Rollback authorization** — if proof fails or wrong target selected

---

## 3) Authorization record requirements (future L-85M)

Future gate evidence must include:

| Field | Content |
|-------|---------|
| Gate ID | e.g. L-85M |
| Operator approval phrase | Exact scoped phrase authorizing env bind + HTTP proof |
| Timestamp UTC | When authorization recorded |
| Target project name | Structural string only |
| Target environment | staging / preview / production |
| Env key name | `READ_ONLY_DATABASE_URL` |
| Scope exclusions | Owner `DATABASE_URL`, Stripe, payment, provider keys unchanged |
| Rollback acknowledged | YES |

**No connection string, password, token value, or host in authorization record.**

---

## 4) Preconditions before L-85M may begin

| Precondition | Source |
|--------------|--------|
| `GET /ops/db-readonly-proof` implemented | L-85K merged (PR #270) |
| Local tests pass | `npm --prefix server run test:db-readonly-proof` |
| `secrets:scan` OK | Required before and after L-85M evidence |
| L-85L authorization gate filed | This gate |
| Read-only Neon role exists | L-85F/G (local proof — not staging runtime) |
| Credential hygiene current | L-85H attestation |

---

## 5) L-85L actions

| Action | Performed |
|--------|-----------|
| Operator authorization recorded for L-85M | **NO** — template only |
| Vercel env mutation | **NO** |
| Deploy | **NO** |
| Live HTTP proof | **NO** |

---

*End.*
