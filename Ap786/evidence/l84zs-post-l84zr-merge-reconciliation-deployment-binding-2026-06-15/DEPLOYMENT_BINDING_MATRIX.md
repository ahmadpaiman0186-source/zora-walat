# L-84ZS — Deployment binding matrix

**Verdict component:** Staging binding **PASS** · Cleanup disposition drives overall **VERDICT-002**

| Field | Value |
|-------|--------|
| Active alias | `https://zora-walat-api-staging.vercel.app` |
| Deployment ID (active) | `dpl_EW1fhoDMgwffTDMMwEc11av9bF1m` |
| Vercel status | **Ready** (Production) |
| Bound source SHA | **`2dc8aaaad7b51e264e7395f76c5da8e0ad34a912`** |
| Includes L-84ZR PR #251? | **YES** — `be030c8` ancestor of `2dc8aaa` |
| Evidence source | GitHub Commit Status API + `vercel inspect` cross-ref |

## Cross-reference proof

| Source | Staging deployment ID |
|--------|----------------------|
| `vercel inspect zora-walat-api-staging.vercel.app` | `dpl_EW1fhoDMgwffTDMMwEc11av9bF1m` |
| GitHub status for commit `2dc8aaa` → `Vercel – zora-walat-api-staging` | `…/EW1fhoDMgwffTDMMwEc11av9bF1m` |

**Match:** deployment ID aligns.

## Note on cleanup commit deploy

Commit `0af7594` has a separate Vercel staging status pointing to `dpl_D7tbrqHCuF9JSBDobwKQvrYgoEDA` (preview branch deploy). **Active production alias** is on **`2dc8aaa`**, not cleanup-only docs commit alone — both include L-84ZR runtime evidence via ancestry.

## Optional GET/HEAD (2026-06-15T17:55:30Z)

| Method | Path | Status | Body preview |
|--------|------|--------|--------------|
| GET | `/health` | 200 | `{"status":"ok"}` |
| HEAD | `/health` | 200 | (timeout on body read; status captured) |
| GET | `/ready` | 200 | readiness JSON, `database_ok` |
| GET | `/api/webhooks/stripe` | 405 | `method_not_allowed` |

Route response alone is **not** source SHA proof — binding proven via GitHub/Vercel metadata above.

---

*End.*
