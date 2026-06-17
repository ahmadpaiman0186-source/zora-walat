# L-85R — Risk classification

---

## Tier definitions

| Tier | Criteria |
|------|----------|
| **HIGH** | Runtime, deploy, env, payment, provider, security behavior changes |
| **MEDIUM** | Tests, config, scripts, build behavior without direct payment/env surface |
| **LOW** | Docs / evidence-only |
| **STALE** | Open ≥37 days, 600+ commits behind current `main` |
| **SUPERSEDED** | Functionally replaced by newer merged L-gate or equivalent on `main` |

---

## Classification summary

| Tier | Count | PRs |
|------|-------|-----|
| **HIGH** | **1** | #5 |
| **MEDIUM** | **0** | — |
| **LOW** | **12** | #6–#17 |
| **STALE** | **13** | #5–#17 (all) |
| **SUPERSEDED** | **0** | — |
| **NEEDS_REBASE** | **13** | #5–#17 (all) |
| **NEEDS_DEEP_AUDIT** | **1** | #5 |

---

## PR #5 — HIGH detail

| Factor | Assessment |
|--------|------------|
| Stripe webhook route changes | **YES** — payment/provider surface |
| Health/readiness route changes | **YES** — deploy probe surface |
| Integration tests | **YES** |
| Conflict with current `main` | **likely** (607 commits behind) |
| Overlap with post-L27 `main` work | **partial** — related incident/webhook files evolved on `main` independently |

**Risk:** Merging without rebase + security/payment review could regress webhook hardening or conflict with L-84/L-85 staging and slim webhook paths.

---

## PRs #6–#17 — LOW detail

| Factor | Assessment |
|--------|------------|
| Runtime code | **NO** |
| Env / deploy config | **NO** |
| Payment provider code | **NO** |
| Content type | Pre-Ap786 `server/docs` packages (L29–L40) |
| Merge-tree vs `main` | **clean** (docs-only additions) |
| Operational risk if merged as-is | **LOW** — but docs may be outdated vs current Ap786 evidence gates |

---

*End.*
