# L-86A — Superseded and stale PR analysis

---

## Merged L-gate context (current `main`)

Ap786 **L-85I through L-85X** (and L-86A predecessor **L-85R/L-85S**) define the active proof chain:

- Read-only DB proof endpoint (L-85K/P)
- Staging env + deploy pickup (L-85V/W)
- L-85M **BLOCKED_404** + L-85X **route mapping audit**
- **L-85M PASS = NO**

## Superseded analysis

| PR range | Content superseded on `main`? | Disposition |
|----------|------------------------------|-------------|
| **#5** L27 webhook | **NO** — not merged; partial overlap with later `main` webhook work | **KEEP_OPEN_BLOCKED** |
| **#6–#17** L29–L40 docs | **NO** — doc files absent on `main` | **CLOSE_STALE** (not CLOSE_SUPERSEDED) |

**CLOSE_SUPERSEDED count: 0** — strict interpretation: L-85 gates do not replace L29–L40 document packages.

## Stale analysis

| Signal | All 13 PRs |
|--------|------------|
| Age | **37–38 days** |
| Behind `origin/main` | **628–630 commits** |
| Last updated | **2026-05-10/11** |
| CI checks | **Empty or stale** |
| L-85X on `main` | **YES** |

**All 13** qualify as **stale** for governance purposes.

## Proof-chain consistency

| Issue | Impact |
|-------|--------|
| Open legacy PRs vs Ap786 evidence | **Audit ambiguity** — unclear which chain is authoritative |
| PR #5 runtime drift | **Accidental merge risk** — could bypass L-85X route findings |
| Docs PRs with launch/compliance language | **Unproven claims** — not claim-grade under current L-85M status |

## Relation to L-85R/L-85S

L-86A **confirms and extends** L-85R inventory with post-L-85X disposition labels. Recommendations align with L-85S phased plan (hold #5; batch stale docs decision).

---

*End.*
