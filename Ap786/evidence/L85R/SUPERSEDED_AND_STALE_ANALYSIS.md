# L-85R — Superseded and stale analysis

---

## Merged L-gate context (post-L-85Q `main`)

Recent merged evidence/runtime gates on `main` include L-85I through L-85Q (PRs #268–#276). These address:

- Read-only DB proof endpoint design and implementation (L-85J–K)
- Staging route/deploy correction (L-85N–O)
- Pre-bootstrap guard (L-85P)
- Structural unauthenticated verification (L-85Q)

**None of the 13 open PRs implement or duplicate those L-85 workstreams.**

---

## Superseded analysis

| PR range | Superseded? | Rationale |
|----------|-------------|-----------|
| **#5** L27 webhook hardening | **NO** | Distinct runtime work; not merged; partial thematic overlap with later `main` webhook/incident code but not equivalent |
| **#6–#17** L29–L40 docs | **NO** | Doc packages not present on `main` (`server/docs/**/L29*` etc. absent); not replaced by Ap786 L-85 evidence |

**SUPERSEDED count: 0**

---

## Stale analysis

| Signal | All 13 PRs |
|--------|------------|
| Age | **37–38 days** since open |
| Commits behind `origin/main` | **607–609** |
| Last updated | **2026-05-10/11** (no activity since open) |
| CI checks | Mixed success/pending; not re-run on current `main` |
| L-85Q merge on `main` | **YES** (`8c0777c`) — inventory taken after this merge |

**STALE count: 13**

All open PRs predate the Ap786 L-85 read-only proof and staging stabilization arc by weeks and hundreds of commits.

---

## Reconciliation with L-85Q

L-85Q proved staging structural route behavior. **No open PR** is required to preserve that outcome — it is already on `main`. Open PRs are **legacy backlog**, not blockers for L-85M retry.

---

*End.*
