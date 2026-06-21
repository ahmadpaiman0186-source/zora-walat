# L-85M-R5-R3B — Vercel log access method

**Gate UTC:** 2026-06-20

---

| Field | Value |
|-------|--------|
| Tool | **Vercel CLI** (`vercel.cmd`, v50.x) |
| Auth | **Existing authenticated CLI session** (no new token extraction) |
| Project | **`zora-walat-api-staging`** |
| Project ID | `prj_cEfwYIsWRcJ4BLz5bcCwc8A5jCeY` |
| Org ID | `team_41v4c37X9wFOHprAoOsw2jc1` |
| Working directory | `server/` (linked `.vercel/project.json`) |

## Commands attempted (metadata-only summary)

| Attempt | Parameters | Outcome |
|---------|------------|---------|
| Project logs + time window | `--project`, `--since`, `--until`, `--status-code 500`, `--no-follow` | **No JSON log lines returned** |
| Project logs + query | `--query "db-readonly-proof"` | **No JSON log lines returned** |
| Deployment logs | `--deployment zora-walat-api-staging-8mmwndiwj.vercel.app`, `-n 500`, `-j` | **1 unrelated static request** (`GET /`, 200) |
| Deployment ID logs | `--deployment dpl_78SrqBYgzQPUu27bM3aoRM2FwmNb`, `--expand` | **1 unrelated static request** |
| Serverless source filter | `--source serverless`, `-n 1000` | **0 JSON lines** |

## Not used

| Method | Status |
|--------|--------|
| `vercel env pull` / `get` | **NOT USED** |
| Vercel UI manual export | **NOT USED** |
| Endpoint retry for log generation | **NOT USED** |

---

*End.*
