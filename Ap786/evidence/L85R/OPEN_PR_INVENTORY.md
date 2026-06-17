# L-85R — Open PR inventory

**Snapshot UTC:** 2026-06-17  
**Repository:** `ahmadpaiman0186-source/zora-walat`  
**Baseline `main`:** `8c0777c` (L-85Q merged)  
**Open PR count:** **13**

---

## Inventory table

| PR | Title | Source branch | Target | Opened (UTC) | Age (days) | Files | Behind `main` | Checks (API) | Conflict (merge-tree) | Category | Superseded by L-85? | Recommendation |
|----|-------|---------------|--------|--------------|------------|-------|---------------|--------------|----------------------|----------|---------------------|----------------|
| **#5** | L27 dispute webhook hardening | `l27-dispute-webhook-hardening` | `main` | 2026-05-10 | 38 | 11 | 607 | success + pending | **likely_conflict** | **runtime-code** (Stripe/webhook/tests) | **NO** | **needs-deep-audit**, **needs-rebase** |
| **#6** | docs(observability): L29 alerting and SLO package | `l29-observability-alerts-docs` | `main` | 2026-05-10 | 38 | 8 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#7** | docs(support): L30 support recovery package | `l30-support-recovery-docs` | `main` | 2026-05-10 | 38 | 7 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#8** | docs(security): L31 security compliance fraud package | `l31-security-compliance-fraud-docs` | `main` | 2026-05-10 | 38 | 8 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#9** | docs(launch): L32 controlled soft launch package | `l32-controlled-soft-launch-docs` | `main` | 2026-05-10 | 38 | 8 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#10** | docs(performance): L33 load stress chaos package | `l33-load-stress-chaos-docs` | `main` | 2026-05-10 | 38 | 8 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#11** | docs(operations): L34 failover drill package | `l34-multi-region-failover-docs` | `main` | 2026-05-10 | 38 | 8 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#12** | docs(infrastructure): L35 reproducible infrastructure package | `l35-iac-reproducible-infra-docs` | `main` | 2026-05-10 | 38 | 9 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#13** | docs(operations): L36 SLO error budget on-call package | `l36-slo-error-budget-oncall-docs` | `main` | 2026-05-10 | 38 | 10 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#14** | docs(vendor): L37 provider fallback package | `l37-vendor-sla-provider-fallback-docs` | `main` | 2026-05-10 | 38 | 8 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#15** | docs(security): L38 pentest compliance package | `l38-security-pentest-compliance-docs` | `main` | 2026-05-10 | 38 | 9 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#16** | docs(governance): L39 release governance package | `l39-release-governance-change-approval-docs` | `main` | 2026-05-11 | 37 | 9 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |
| **#17** | docs(operations): L40 post soft launch learning package | `l40-post-soft-launch-learning-loop-docs` | `main` | 2026-05-11 | 37 | 9 | 609 | success + pending | clean_merge_tree | **docs/evidence-only** | **NO** | **stale**, **safe-to-review-later**, **needs-rebase** |

---

## PR #5 file scope (runtime — summary)

Touches: `stripeWebhook.routes.js`, `stripe.js`, `health.routes.js`, `readinessBoundedChecks.js`, `phase1StripeChargeIncidents.js`, integration/unit tests, `.gitignore`. **Not** present on current `main` as a single package; partial related files exist on `main` (e.g. `phase1StripeChargeIncidents`) — requires diff audit before any merge.

## Docs PR file scope (common pattern)

All changes under `server/docs/**` and `server/docs/runbooks/**` only — no runtime source, tests, or deploy config in sampled paths.

## Checks note

GitHub commit status API returned mixed **`success`** and **`pending`** for all open PRs. Full check rollup unavailable without authenticated `gh` / GitHub App token. Treat CI status as **indeterminate / stale** until rebase and fresh run.

## Mergeable field

GitHub `mergeable` / `mergeable_state` returned **`undefined`** on unauthenticated API. Local `git merge-tree` used as conflict proxy (see table).

---

*End.*
