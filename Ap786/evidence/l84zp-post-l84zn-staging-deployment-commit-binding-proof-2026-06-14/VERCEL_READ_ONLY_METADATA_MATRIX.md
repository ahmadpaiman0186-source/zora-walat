# L-84ZP — Vercel read-only metadata matrix

**Verdict:** `CORE10-L84ZP-VERDICT-001: POST_L84ZN_STAGING_DEPLOYMENT_COMMIT_BINDING_PROVEN_READ_ONLY_NO_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

**Project:** `zora-walat-api-staging` (`prj_cEfwYIsWRcJ4BLz5bcCwc8A5jCeY` from local `.vercel/project.json` — project/org IDs only, no tokens)

## Active alias inspect

| Field | Value |
|-------|--------|
| Command | `vercel inspect zora-walat-api-staging.vercel.app` |
| Deployment ID | `dpl_ERo8kzET7Sh9u37TY7YFGzBukYyT` |
| Status | **Ready** |
| Target | production |
| Rewrites in build config | `/webhooks/stripe` → `/api/webhooks/stripe`; health/ready bridges present |

## Recent deployments (`vercel ls zora-walat-api-staging`)

| Age (at gate) | URL slug | Status | Environment |
|---------------|----------|--------|-------------|
| ~11m | `…-h74tzbmym` | **Ready** | Production (**active alias**) |
| ~21m | `…-qygitasv3` | Ready | Preview |
| ~44m | `…-dpiqd75xb` | Ready | Production (prior) |

## Git SHA in Vercel CLI JSON

| Source | Git SHA exposed? |
|--------|------------------|
| `vercel inspect --json` for `dpl_ERo8…` | **No** full SHA in CLI JSON fields searched |
| GitHub Commit Status API cross-ref | **Yes** — SHA **`9109df6`** bound to `dpl_ERo8…` |

## Multi-project Ready on current main (`9109df6` GitHub statuses)

| Context | State |
|---------|-------|
| Vercel – zora-walat-api-staging | success |
| Vercel – zora-walat-api | success |
| Vercel – zora-walat | success |
| Vercel – zora-walat-mj41 | success |

---

*End.*
