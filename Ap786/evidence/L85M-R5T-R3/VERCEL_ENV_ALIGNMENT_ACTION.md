# L-85M-R5T-R3 — Vercel env alignment action

**Gate UTC:** 2026-06-20

---

| Field | Value |
|-------|--------|
| Platform | Vercel |
| Project name | **`zora-walat-api-staging`** |
| Project ID | `prj_cEfwYIsWRcJ4BLz5bcCwc8A5jCeY` |
| Team / org ID | `team_41v4c37X9wFOHprAoOsw2jc1` |
| Env variable name | **`OPS_HEALTH_TOKEN`** |
| Scope / target | **`production`** |
| Mutation type | **Overwrite** (`vercel env add … --force --sensitive --yes --non-interactive`) |
| CLI exit code | **0** |
| Env value in evidence | **NOT RECORDED** |

## Metadata-only `updatedAt` (ms)

| Phase | `updatedAt` | Notes |
|-------|-------------|-------|
| Pre-alignment (this gate) | **NOT CAPTURED** | Initial metadata read failed due CLI stderr/JSON wrapper parse in alignment shell |
| Historical R5T-R2 anchor (reference) | `1782004198954` | From committed R5T-R2 evidence — **not** re-read for value |
| Post-alignment (this gate) | **`1782024713667`** (`2026-06-21T06:51:53.667Z`) | Names-only `vercel env list` metadata |
| Changed vs post-alignment read | **YES** — new `updatedAt` observed after successful `env add` |

## Not mutated in this gate

| Item | Status |
|------|--------|
| `READ_ONLY_DATABASE_URL` | **NOT MUTATED** |
| `DATABASE_URL` | **NOT MUTATED** |
| `OPS_INFRA_HEALTH_TOKEN` | **NOT MUTATED** |
| Other Vercel projects | **NOT MUTATED** |
| Production API project (`zora-walat-api`) | **NOT MUTATED** |

---

*End.*
