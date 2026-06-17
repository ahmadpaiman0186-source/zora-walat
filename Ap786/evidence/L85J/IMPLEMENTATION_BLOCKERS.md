# L-85J — Implementation blockers and future evidence requirements

---

## 1) Current blockers (why runtime proof cannot pass today)

| # | Blocker | Evidence source |
|---|---------|-----------------|
| B1 | `READ_ONLY_DATABASE_URL` not consumed by tracked runtime code | L-85I grep — zero matches in `server/**`, handlers, root `api/**` |
| B2 | No safe runtime DB identity proof endpoint exists | L-85I §8 — `/health`, `/ready`, `/ops/health` insufficient |
| B3 | All runtime DB paths use owner `DATABASE_URL` via shared Prisma | `server/src/db.js`, slim ready handler, ops health |
| B4 | Staging Vercel target **`zora-walat-api-staging`** is **INFERRED**, not fully repo-proven as linked deploy root + env binding | L-85I §9; no tracked Vercel project metadata file |
| B5 | Future env mutation requires explicit operator approval | L-85I `MUTATION_AUTHORIZATION_GATE.md` |
| B6 | Future deploy required before HTTP proof | No endpoint to call |
| B7 | Design-only gate cannot produce live response | L-85J scope restriction |
| B8 | L-85G local probe does not transfer to staging runtime | Ephemeral CLI — not deployed proof |

**Conservative status:** Runtime read-only DB identity proof is **BLOCKED** until authorized implementation + deploy + HTTP evidence gate.

---

## 2) Minimum work sequence (future — not executed in L-85J)

```
1. Operator authorization gate (post L-85J)
2. Implement GET /ops/db-readonly-proof per design docs
3. secrets:scan + code review
4. Set READ_ONLY_DATABASE_URL on zora-walat-api-staging (authorized gate)
5. Deploy staging API (authorized gate)
6. Controlled HTTP proof capture (flags only)
7. File runtime evidence gate with NON_CLAIMS
```

---

## 3) Future runtime proof — required evidence package

A future gate **cannot PASS** runtime read-only proof unless evidence includes:

| # | Requirement | Format |
|---|-------------|--------|
| E1 | Branch and commit proof | git log / PR link — structural |
| E2 | Code diff proof (if code added) | PR diff — no secrets |
| E3 | Env mutation attestation (if env changed) | Operator attestation — **key names only**, no values |
| E4 | Vercel target proof | Project name + tier confirmation |
| E5 | Deploy ID (if deployed) | Vercel deployment ID — structural |
| E6 | Protected endpoint response | JSON with **safe flags only** per `ENDPOINT_CONTRACT.md` |
| E7 | No secret output | Attestation + scan |
| E8 | No row export | `no_rows_exported: true` in response + design compliance review |
| E9 | No write probe | SQL review against `SAFE_SQL_SPEC.md` |
| E10 | `secrets:scan` OK | Command output |
| E11 | Clear NON_CLAIMS | Separate file in evidence dir |
| E12 | Explicit operator authorization record | Gate ID + approval phrase + scope |

Missing any required item → verdict remains **FAIL** or **BLOCKED**, not PASS.

---

## 4) Design vs implementation gap

| Design artifact (L-85J) | Implementation status |
|---------------------------|------------------------|
| `GET /ops/db-readonly-proof` | **Not in codebase** |
| Separate read-only client | **Not in codebase** |
| `READ_ONLY_DATABASE_URL` in `env.js` | **Not in codebase** |
| Safe SQL bundle | **Specified only** |
| Response contract | **Specified only** |

---

## 5) Dependency blocker (conditional)

| Scenario | Blocker |
|----------|---------|
| Reuse ephemeral `PrismaClient` with URL override | No new dependency — still requires code + auth gate |
| Add `pg` package | **Blocked** until separate dependency authorization |

L-85J adds **no** dependencies.

---

## 6) L-85J verdict

**Runtime proof from design-only evidence:** **IMPOSSIBLE**

**Gate outcome:** Design filed locally — **NO RUNTIME PROOF**

---

*End.*
