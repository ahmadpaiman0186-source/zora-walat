# L-85N — Deploy root diagnosis

Conservative diagnosis of L-85M `/ops/*` **404 HTML** while `/health` **200 JSON**.

---

## 1) Symptom pattern (from L-85M)

| Observation | Implication |
|-------------|-------------|
| `/health` → 200 JSON | Root slim bridge **or** API slim health active |
| `/ops/health` → 404 HTML | Full Express ops router **not** serving requests |
| `/ops/db-readonly-proof` → 404 HTML | L-85K route **not** reachable on active deployment |
| `/api/admin/ops/db-readonly-proof` → 404 HTML | Same — Express mount not active |

---

## 2) Candidate causes evaluated

| # | Cause | Confidence | Evidence |
|---|-------|------------|----------|
| C1 | Staging project deployed from **repo root** (Next.js), not `server/` | **LIKELY** | `api/health-ready.mjs` comment; L-84ZW same pattern; L-85M symptom match |
| C2 | Root `vercel.json` has **no rewrite** for `/ops/*` | **PROVEN** | Root `vercel.json` rewrite list |
| C3 | `server/api/index.mjs` **not exposed** on root deploy | **PROVEN** | `api/health-ready.mjs` comment; root `api/` file list |
| C4 | L-85K commit **not** in deployed artifact | **UNKNOWN** | No deploy ID captured in L-85M; 404 pattern consistent with C1 even if L-85K present in repo |
| C5 | Route path mismatch in code | **NO** | Route registered at `/ops/db-readonly-proof` — **PROVEN** in `ops.routes.js` |
| C6 | Route not mounted in Express | **NO** | Mounted in `app.js` — **PROVEN** |
| C7 | Stale deployment before L-85K only (server/ deploy correct) | **UNLIKELY** | Would not explain `/health` via root bridge + `/ops` 404 together as cleanly as C1 |
| C8 | Wrong Vercel project alias | **UNKNOWN** | Host marker matches tooling; not independently proven in L-85N |
| C9 | `server/vercel.json` catch-all inactive | **LIKELY** (if C1 true) | Catch-all only applies when root directory is `server/` |

---

## 3) Primary diagnosis (conservative)

**Most likely root cause:** Active **`zora-walat-api-staging`** deployment uses **repository root** (`./`) Next.js surface with **limited root `api/` bridges**, so **`/ops/*` Express routes (including L-85K `db-readonly-proof`) are not in the active serverless graph**.

| Field | Value |
|-------|--------|
| Likely deploy root issue | **YES** |
| Confidence | **LIKELY** (symptom + tracked routing PROVEN; Vercel UI root directory **UNKNOWN** in L-85N) |

---

## 4) What is NOT the primary diagnosis

| Ruled out (tracked code) | Confidence |
|--------------------------|------------|
| L-85K route missing from repo | **PROVEN** false |
| L-85K not mounted in Express | **PROVEN** false |
| Service uses owner DB fallback by design | **PROVEN** false |

---

## 5) Secondary blockers for L-85M retry (unchanged)

| Blocker | Status |
|---------|--------|
| `READ_ONLY_DATABASE_URL` Vercel bind unverified | Open |
| `OPS_HEALTH_TOKEN` secure injection for live call | Open |

**Route must return JSON before env proof is meaningful.**

---

## 6) Minimum correction before live proof

1. **Prove** Vercel project root directory and framework in UI (operator).
2. **Align** staging API deploy with `server/` + `server/vercel.json` **OR** add authorized root bridge for `/ops/db-readonly-proof` (code change — separate gate).
3. **Redeploy** staging API only if authorized.
4. **Verify** `/ops/db-readonly-proof` returns JSON (BLOCKED/FAIL/PASS) — not HTML 404.
5. Then retry L-85M env bind + authenticated proof.

---

*End.*
