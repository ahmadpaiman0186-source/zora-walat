# P0 — Neon staging branch governance audit

**Date:** 2026-05-19  
**Trigger:** Neon email — branch age > 7 days  
**Sanitization:** No secrets, full URLs, connection strings, PII, or raw Stripe payloads.

---

## Executive verdict

| Field | Value |
|-------|--------|
| **P0_STATUS** | `NEEDS_OPERATOR_DASHBOARD_CONFIRMATION` |
| **DELETE_BRANCH** | `FORBIDDEN_UNTIL_VERIFIED_UNUSED` |
| **SET_EXPIRATION** | `FORBIDDEN_IF_STAGING_ACTIVE` |
| **ENABLE_BRANCH_PROTECTION** | `RECOMMENDED_IF_LONG_LIVED_STAGING` |

**Summary:** The Neon branch name and project name are **not** recorded in tracked repository sources. Staging API behavior depends on whatever `DATABASE_URL` Vercel injects at runtime (value **not** in git). Operator must confirm in **Neon Console** and **Vercel Environment Variables** whether `staging-stripe-test-2026-05-12` is the live staging database or a disposable test branch. **No branch deletion, expiration, env mutation, or migrations were performed for this audit.**

This audit is **governance evidence only** — not production certification.

---

## Neon objects (from operator email)

| Attribute | Value |
|-----------|--------|
| **Branch name** | `staging-stripe-test-2026-05-12` |
| **Project name** | `neon-bistre-flame` |
| **Age signal** | > 7 days (Neon notification) |
| **Repo tracked reference** | **None found** (see §1) |

---

## 1. Repository configuration scan (read-only)

Searched tracked sources for literal branch/project names and env variable **names** (values never printed).

### Branch / project literals

| Pattern | Present in tracked repo? |
|---------|---------------------------|
| `staging-stripe-test-2026-05-12` | **No** |
| `neon-bistre-flame` | **No** |

### Environment variable names (representative paths)

| Variable | Referenced? | Example paths (names only) |
|----------|-------------|----------------------------|
| `DATABASE_URL` | **Yes** | `server/src/db.js`, `server/src/lib/normalizeDatabaseUrlEnv.js`, `server/bootstrap.js`, `server/scripts/prisma-cli.mjs`, `server/scripts/test-db-connection.mjs`, `server/.env.local.example` (commented placeholder shape), `server/test/setupTestEnv.mjs`, `server/test/integrations/preloadTestDatabaseUrl.mjs`, `server/tools/zwDoctor/invariants.mjs` |
| `TEST_DATABASE_URL` | **Yes** | `server/test/integrations/preloadTestDatabaseUrl.mjs`, integration test files, `server/.env.local.example` |
| `DIRECT_URL` | **No** | — |
| `POSTGRES_*` | **No** (generic `POSTGRES` env name) | — |
| Neon-specific env (`NEON_*`) | **No** | — |
| Vercel deploy | **Yes** | `server/package.json` (`deploy:staging`, `deploy:staging:guard`), `server/scripts/assert-vercel-api-deploy-root.mjs`, `server/vercel.json` |
| Staging API base (public hostname) | **Yes** | `server/tools/staging-auth-checkout-operator.mjs`, `server/tools/zw-staging-smoke.mjs`, `server/tools/zwDoctor/invariants.mjs` — hostname `zora-walat-api-staging.vercel.app` (no DB credentials) |

**Conclusion:** Branch identity lives in **Neon/Vercel operator consoles**, not in Ap786 or application source. Repo correctly avoids committing `DATABASE_URL` values.

---

## 2. Deployment and verification tooling

### Staging deploy / guard

| Tool | Path / command | DB branch identity? |
|------|----------------|---------------------|
| Deploy root guard | `npm run deploy:staging:guard` → `server/scripts/assert-vercel-api-deploy-root.mjs` | **No** — filesystem/Vercel routing only |
| Staging deploy | `npm run deploy:staging` | **No** — uses Vercel CLI; does not log `DATABASE_URL` |
| Vercel config | `server/vercel.json` | **No** DB fields |

### Staging smoke / control plane

| Tool | Command | DB branch identity? |
|------|---------|---------------------|
| Staging smoke | `npm run zw:smoke:staging` → `server/tools/zw-staging-smoke.mjs` | **No** — deploy guard + `zw-doctor all` + optional operator modes |
| zw-doctor | `npm run zw:doctor` | **No** — static invariants; staging health is HTTP `/api/health` only |
| Super-System Guard (CI) | `.github/workflows/super-system-guard.yml` | **No** DB; no repo secrets |

### Operator payment / L-11 verification (read-only enums)

| Tool | Modes | Uses DB via |
|------|-------|-------------|
| `staging-auth-checkout-operator.mjs` | `status-check`, `phase1-truth-check`, `l11-post-refund-verify`, `l11-refund-target`, etc. | Staging API + JWT (`.staging-token.local`, gitignored) |
| L-11 harness | `server/tools/stagingOperatorL11*.mjs` | Stripe test mode + staging API |
| Email verify (optional) | `server/scripts/staging-verify-operator-email.mjs` | Prisma when `DATABASE_URL` usable locally; documents `MIN_USABLE_DATABASE_URL_LENGTH` boolean check **without** printing URL |

### DB connectivity (local operator only)

| Tool | Command | Leaks connection string? |
|------|---------|--------------------------|
| Prisma migrate | `npm run db:migrate` | **No** in stdout by design if env local |
| DB health | `npm run db:health` → `test-db-connection.mjs` | **No** — prints `connection: ok` or error code only |

**Gap:** No existing tool reports Neon **branch name** without reading `DATABASE_URL` (forbidden in logs/commits).

### Proposed safe diagnostic enhancement (not implemented)

Add optional **non-secret** Vercel env label, set manually by operator after dashboard confirmation:

- Name: `ZW_NEON_BRANCH_LABEL` (plain text, e.g. `staging-stripe-test-2026-05-12`)
- Name: `ZW_NEON_PROJECT_LABEL` (plain text, e.g. `neon-bistre-flame`)

`zw-doctor` mode `neon-governance` could echo **labels only** (never `DATABASE_URL`). Until then, governance relies on Neon/Vercel dashboards.

---

## 3. Risk analysis

| Risk | Description | Severity if mis-governed |
|------|-------------|---------------------------|
| Accidental staging outage | Deleting or expiring the branch wired to Vercel staging breaks API/Prisma | **High** |
| Broken payment/refund/webhook verification | L-8–L-11 and future L-13 proofs require stable staging DB | **High** |
| Stale branch / data drift | Long-lived test branch may diverge from production schema expectations | **Medium** |
| Resource waste | Idle branches incur Neon compute/storage cost | **Low–Medium** |
| Accidental deletion | Neon email may prompt cleanup; wrong branch = data loss | **Critical** |
| PII / security exposure | Branch cloned from production without sanitization increases exposure | **High** (if applicable) |

---

## 4. Operator checklist — Neon Dashboard

Perform in [Neon Console](https://console.neon.tech) (no automation from this audit):

1. **Open project** `neon-bistre-flame` → branch `staging-stripe-test-2026-05-12`.
2. **Activity:** Recent queries / connections in last 7–14 days? (active staging vs dormant)
3. **Compute:** Endpoint running? Autosuspend settings compatible with Vercel serverless?
4. **Branch role:** Primary staging vs experimental Stripe test fork — note in ticket (enum: `ACTIVE_STAGING` | `TEMP_TEST` | `UNKNOWN`).
5. **Data lineage:** Created from empty / seed / production fork? (affects PII risk)
6. **Protection:** Enable **branch protection** if this is long-lived staging (prevents accidental delete).
7. **Expiration:** For **active staging**, keep expiration **disabled**. For **verified unused** branch only: plan migration first, then expire/delete with separate approval.

---

## 5. Operator checklist — Vercel staging

Project: API staging deployment (`zora-walat-api-staging` per repo docs). **Do not paste env values into git.**

1. **Settings → Environment Variables** (Preview/Production as used for staging API):
   - Confirm variable **name** `DATABASE_URL` exists for staging deployment.
   - Record **whether value hostname suffix** matches Neon branch endpoint (operator notes only — not in Ap786).
2. **Optional:** Add non-secret labels `ZW_NEON_BRANCH_LABEL` / `ZW_NEON_PROJECT_LABEL` after confirmation (see §2 proposal).
3. **Redeploy:** Not required for this audit; required only after intentional env changes.
4. **Verify API:** `GET /api/health` → HTTP 200 (no DB string in response).

---

## 6. Decision tree

```text
Is staging-stripe-test-2026-05-12 the DATABASE_URL target for zora-walat-api-staging?
│
├─ YES (active staging)
│   ├─ ENABLE branch protection on Neon
│   ├─ DO NOT set branch expiration
│   ├─ DO NOT delete branch
│   ├─ Document as long-lived staging in operator runbook
│   └─ Optional: set ZW_NEON_BRANCH_LABEL on Vercel for future zw-doctor visibility
│
└─ NO (temporary / unused)
    ├─ Identify correct staging branch
    ├─ Update Vercel DATABASE_URL to correct branch (operator approval + maintenance window)
    ├─ Run read-only verification: status-check + l11-post-refund-verify enums
    ├─ Only after proof: consider expire/delete old branch (separate approval; NOT done in this audit)
    └─ Update Ap786 with new governance note
```

---

## 7. Sanitization rules (Ap786)

- No secrets, tokens, keys, JWTs, or `DATABASE_URL` values  
- No full Neon connection URLs or hostnames with credentials  
- No customer PII or raw webhook payloads  
- Stripe references: suffix-only order ids in other docs; none required here  
- Evidence: enums, booleans, branch **names** from operator email only  

---

## 8. Next safe commands (operator workstation)

```bash
# Repo hygiene (no DB required)
cd server
npm run secrets:scan
npm run zw:doctor -- summary --strict --no-operator --no-staging
npm run zw:doctor -- incidents --strict --ci-static

# Staging API liveness (no secrets in output)
# curl -sS -o /dev/null -w "%{http_code}" https://zora-walat-api-staging.vercel.app/api/health

# After Neon/Vercel confirmation only — read-only payment state (local token file, gitignored)
# node tools/staging-auth-checkout-operator.mjs status-check
# node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
```

**Forbidden in this P0:** `neon branches delete`, branch expiration API, `prisma migrate`, refund/payment/webhook resend, editing Vercel/Neon secrets from automation.

---

## 9. Actions explicitly not performed

| Action | Status |
|--------|--------|
| Delete Neon branch | **Not performed** |
| Set branch expiration | **Not performed** |
| Modify Vercel/staging env | **Not performed** |
| Run migrations | **Not performed** |
| Refunds / Stripe payments | **Not performed** |
| Commit secrets | **Not performed** |

---

## Related evidence

- `SUPER_SYSTEM_STAGING_SMOKE_PROOF.md`  
- `PR21_SUPER_SYSTEM_GUARD_CI_GREEN_EVIDENCE.md`  
- `L13_DUPLICATE_REFUND_EVENT_SAFETY_CHECKLIST.md` (requires stable staging DB; **not executed**)  
- `server/docs/SECRETS_MANAGEMENT.md`
