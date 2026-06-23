# L-86D — Baseline verification

**Gate UTC:** 2026-06-23

---

| Check | Result |
|-------|--------|
| `main` HEAD | `bc0ae6edf0b8d08d6521f9dc4752ad1e2b36dbd6` |
| L-86B commit `973421c` in `main` | **YES** |
| L-86A env keys on `zora-walat-api` Production | **YES** — `OPS_HEALTH_TOKEN`, `READ_ONLY_DATABASE_URL` (names only) |
| L-86C-R redeploy after L-86A env | **YES** — `dpl_Bzx564dBYynLjZjQ2wsV132148jc` |
| Production endpoint authorized | **YES** — single GET only |
| Second request authorized | **NO** |
| Env edit / redeploy / code change in L-86D | **NO** |
| Token / DB URL printed in evidence | **NO** |

---

*End.*
