# L-85S — Phased resolution plan

**Scope:** 13 legacy open PRs (#5–#17) per L-85R inventory  
**Principle:** Preserve current `main`; no legacy PR mutation without explicit operator authorization per phase.

---

## Phase 1 — Preserve current `main` (active now)

| Action | Status |
|--------|--------|
| Continue Ap786 L-85M+ gates on `main` | **Authorized path** |
| Merge/close/rebase legacy PRs | **FORBIDDEN** |
| Deploy / env mutation for legacy PRs | **FORBIDDEN** |
| L-85S strategy evidence filed | **THIS GATE** |

**Exit criteria:** L-85S evidence committed; operator acknowledges strategy.

---

## Phase 2 — Deep-audit PR #5 separately

| Step | Gate type |
|------|-----------|
| Isolated diff review | Evidence-only |
| Conflict/rebase analysis (throwaway worktree) | Evidence-only |
| Payment webhook impact analysis | Evidence-only |
| No-pay-no-service impact analysis | Evidence-only |
| Security / secret-surface review | Evidence-only |
| Test matrix review | Evidence + authorized local test run |
| Rollback plan | Evidence-only |
| Staging proof plan | Separate authorized proof gate |

**Exit criteria:** Operator sign-off on audit packet; explicit merge-or-close decision for #5.

**No merge in Phase 2.**

---

## Phase 3 — Batch decision on docs PRs #6–#17

| Option | Description |
|--------|-------------|
| **A — Keep open** | No action; revisit quarterly or after L-85M PASS |
| **B — Rebase + review** | Operator authorizes rebase batch; editorial review; docs-only merge gate |
| **C — Close as stale** | Operator authorizes batch close with L-85S attestation reference |

**Exit criteria:** Written operator decision recorded in new evidence gate (e.g. L-85U).

**No close or merge in Phase 3 planning gate without Option B/C authorization.**

---

## Phase 4 — Execute selected actions (operator-authorized only)

| Action | Preconditions |
|--------|---------------|
| Close selected PRs | Phase 3 Option C authorization + evidence file |
| Rebase selected PRs | Phase 3 Option B authorization |
| Open replacement doc PRs | Preferred over merging 37-day-old branches verbatim |

**No action in L-85S.**

---

## Phase 5 — Merge only with fresh proof and checks

| Requirement | Applies to |
|-------------|------------|
| Rebased onto current `main` | #5 and any docs PR merged |
| Fresh CI green | All merge candidates |
| `secrets:scan` pass | All |
| Risk-tier proof | #5: Gates A–H + staging proof; #6–#17: docs review only |
| No merge during L-85M prep | Unless operator explicitly reprioritizes |

**Immediate merge of any legacy PR: NO**

---

## Priority relative to L-85M

| Workstream | Priority |
|------------|----------|
| L-85M authenticated read-only proof retry | **Higher** — on critical path |
| PR #5 deep audit | **Medium** — parallel planning only |
| PRs #6–#17 batch decision | **Lower** — defer to Phase 3 |

---

*End.*
