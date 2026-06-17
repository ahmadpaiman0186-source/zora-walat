# L-85I — Mutation authorization gate

Defines what must be **separately authorized** before any infrastructure or runtime mutation related to read-only DB routing. **L-85I performs no mutations.**

---

## 1) Mutations explicitly out of scope for L-85I

| Action | L-85I status |
|--------|--------------|
| Vercel env var create/update/delete | **NOT PERFORMED** |
| Neon role/password change | **NOT PERFORMED** |
| Deploy / redeploy | **NOT PERFORMED** |
| Stripe / payment provider config | **NOT PERFORMED** |
| Application runtime code change | **NOT PERFORMED** |
| Read `server/.env.local` | **NOT PERFORMED** |

---

## 2) Future mutation classes requiring separate gate + operator approval

### A) Vercel — `READ_ONLY_DATABASE_URL` on staging API

| Prerequisite | Required |
|--------------|----------|
| Target project | **`zora-walat-api-staging` only** (first binding) |
| Owner `DATABASE_URL` | **Must remain unchanged** unless a separately scoped gate explicitly authorizes owner URL change |
| Production project `zora-walat-api` | **Forbidden** for initial read-only runtime binding |
| Approval artifact | New Ap786 gate ID (e.g. L-85J+) with operator approval phrase |
| Post-bind proof | Controlled HTTP evidence — not CLI-only |

### B) Runtime code — safe DB identity endpoint

| Prerequisite | Required |
|--------------|----------|
| Separate PR | New route + isolated read-only client |
| Security review | Token gate, staging tier guard, no row export, no URL leakage |
| No reuse of owner `db.js` singleton | Mandatory second connection from `READ_ONLY_DATABASE_URL` |
| Deploy | Staging only until HTTP proof passes |

### C) Credential rotation (Neon read-only role)

| Prerequisite | Required |
|--------------|----------|
| Trigger | Exposure suspicion or scheduled rotation policy |
| Scope | Read-only role password only — not owner unless separate gate |
| Evidence | L-85H-pattern hygiene gate — no secret values in repo |

### D) `OPS_HEALTH_TOKEN` rotation on staging

| Prerequisite | Required |
|--------------|----------|
| Separate gate | L-84 series pattern — clean token, no Stripe-like values in wrong fields |
| Proof | Runtime HTTP after redeploy — not filed in inventory gate |

### E) Stripe / payment / provider env

| Prerequisite | Required |
|--------------|----------|
| Explicit payment-governance gate | **Never** bundled with read-only DB env binding |
| Live-mode keys | Separate controlled-live proof gates only |

---

## 3) Authorization checklist (operator — future use)

Before any mutation in §2:

- [ ] Gate ID assigned and recorded in Ap786
- [ ] Branch scope limited to authorized files only
- [ ] `main` baseline clean; secrets scan planned post-commit
- [ ] Staging vs production project name double-checked (**not** production for first read-only bind)
- [ ] Rollback plan documented (remove env var / revert deploy)
- [ ] No global launch, money-path, or market claims in gate verdict until proof gates pass
- [ ] Evidence captures **structural** outputs only

---

## 4) Claims that remain prohibited until proof gates pass

See [NON_CLAIMS.md](./NON_CLAIMS.md). Summary:

- Staging runtime uses read-only DB role for deployed API traffic
- Staging `DATABASE_URL` identity match to intended Neon branch/database
- Zero-write enforcement at deployed runtime boundary
- Global launch GO / production money-path clearance
- Provider/market/compliance attestation beyond filed evidence

---

## 5) Conservative L-85I authorization verdict

**AUTHORIZATION TO MUTATE:** **DENIED** in L-85I (inventory-only gate).

Next authorized work must be a **new numbered gate** with explicit operator scope — not implied by this inventory.

---

*End.*
