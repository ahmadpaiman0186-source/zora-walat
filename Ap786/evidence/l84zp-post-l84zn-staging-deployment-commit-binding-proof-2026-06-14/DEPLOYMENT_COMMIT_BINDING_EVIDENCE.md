# L-84ZP — Deployment commit binding evidence

**Verdict:** `CORE10-L84ZP-VERDICT-001: POST_L84ZN_STAGING_DEPLOYMENT_COMMIT_BINDING_PROVEN_READ_ONLY_NO_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## Active staging deployment

| Field | Value |
|-------|--------|
| Host alias | `https://zora-walat-api-staging.vercel.app` |
| Deployment ID | `dpl_ERo8kzET7Sh9u37TY7YFGzBukYyT` |
| Deployment URL | `https://zora-walat-api-staging-h74tzbmym.vercel.app` |
| Vercel status | **Ready** (Production target) |
| Observed UTC | 2026-06-14 (~gate execution) |

**Source:** `vercel inspect zora-walat-api-staging.vercel.app` (authenticated CLI, read-only).

## Git commit binding

| Field | Value |
|-------|--------|
| Bound source SHA | **`9109df695cdcd4922092e9bca886a932f1f779e1`** (`9109df6`) |
| GitHub status context | `Vercel – zora-walat-api-staging` |
| Status state | **success** — "Deployment has completed" |
| Status `target_url` | `…/zora-walat-api-staging/ERo8kzET7Sh9u37TY7YFGzBukYyT` |
| ID match | **`target_url` deployment ID = active `dpl_ERo8kzET7Sh9u37TY7YFGzBukYyT`** |

**Source:** `GET https://api.github.com/repos/ahmadpaiman0186-source/zora-walat/commits/9109df6/status` (read-only, no auth).

## L-84ZN inclusion

| Commit | Role | Included in deployed `9109df6`? |
|--------|------|--------------------------------|
| `b4691b9` | L-84ZN PR #247 merge | **Yes** — git ancestor |
| `496b2b6` | L-84ZN handler hardening | **Yes** — git ancestor |

**Note:** Active production alias is on **`9109df6`** (main after L-84ZO docs merge #248), not literally pinned to merge commit `b4691b9` alone. L-84ZN code is present as ancestor commits.

## Superseded L-84ZN-era staging deploy (historical)

| SHA | Staging deployment ID (GitHub status) |
|-----|---------------------------------------|
| `b4691b9` | `HH5Cufo6jzJGSjg6dZHmdPyGgqKT` — superseded by `ERo8…` |

---

*End.*
