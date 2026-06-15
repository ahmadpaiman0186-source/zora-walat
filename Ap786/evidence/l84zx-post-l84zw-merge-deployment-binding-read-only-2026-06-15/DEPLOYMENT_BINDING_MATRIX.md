# L-84ZX — Deployment binding matrix

**Verdict component:** Staging binding **PASS**

| Field | Value |
|-------|--------|
| Active alias | `https://zora-walat-api-staging.vercel.app` |
| Deployment ID (from GitHub status URL) | **`dpl_DwFE3pQct9FpqNh5m75uRpWbEUrR`** |
| Vercel status | **success** — "Deployment has completed" |
| Bound source SHA | **`20fb4fab091bb0ba143e3bc323dbc69813f9eadc`** (`20fb4fa`) |
| Includes L-84ZW PR #256? | **YES** — merge commit; `68e8ebf` is direct parent |
| Evidence source | GitHub Commit Status API (read-only) |

## Cross-reference proof

| Source | Detail |
|--------|--------|
| GitHub GET `/repos/.../commits/20fb4fa/status` | `state: success`, `sha: 20fb4fa…` |
| Context `Vercel – zora-walat-api-staging` | `target_url`: `https://vercel.com/ahmadpaiman0186-sources-projects/zora-walat-api-staging/DwFE3pQct9FpqNh5m75uRpWbEUrR` |
| Status timestamp | `2026-06-15T21:44:21Z` |

**Binding logic:** GitHub reports Vercel staging deployment **completed successfully** for commit **`20fb4fa`**, which is the PR #256 merge commit containing L-84ZW bridge files (`api/create-checkout-session.mjs`, `vercel.json` rewrite).

## Verdict row

| Field | Verdict |
|-------|---------|
| Includes L-84ZW? | **YES** |
| Evidence source | GitHub Commit Status API |
| Overall binding | **PASS** |

Route HTTP responses alone are **not** sufficient for SHA binding — metadata above is primary proof.

---

*End.*
