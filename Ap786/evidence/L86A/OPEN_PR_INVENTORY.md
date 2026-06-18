# L-86A — Open PR inventory

**Snapshot UTC:** 2026-06-18  
**Repository:** `ahmadpaiman0186-source/zora-walat`  
**Open count:** **13**

---

## Full inventory

| PR | Title | URL | Base | Head | Author | Draft | Head SHA | Created | Updated | Files | Behind `main` | Merge-tree | Checks | Stale checks |
|----|-------|-----|------|------|--------|-------|----------|---------|---------|-------|---------------|------------|--------|--------------|
| **#5** | L27 dispute webhook hardening | [PR #5](https://github.com/ahmadpaiman0186-source/zora-walat/pull/5) | `main` | `l27-dispute-webhook-hardening` | ahmadpaiman0186-source | open | `9ecbcb8` | 2026-05-10 | 2026-05-10 | 11 | 628 | likely_conflict | *(empty)* | **YES** |
| **#6** | docs(observability): L29 alerting and SLO package | [PR #6](https://github.com/ahmadpaiman0186-source/zora-walat/pull/6) | `main` | `l29-observability-alerts-docs` | ahmadpaiman0186-source | open | `b3f9afa` | 2026-05-10 | 2026-05-10 | 8 | 630 | clean | *(empty)* | **YES** |
| **#7** | docs(support): L30 support recovery package | [PR #7](https://github.com/ahmadpaiman0186-source/zora-walat/pull/7) | `main` | `l30-support-recovery-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 7 | 630 | clean | *(empty)* | **YES** |
| **#8** | docs(security): L31 security compliance fraud package | [PR #8](https://github.com/ahmadpaiman0186-source/zora-walat/pull/8) | `main` | `l31-security-compliance-fraud-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 8 | 630 | clean | *(empty)* | **YES** |
| **#9** | docs(launch): L32 controlled soft launch package | [PR #9](https://github.com/ahmadpaiman0186-source/zora-walat/pull/9) | `main` | `l32-controlled-soft-launch-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 8 | 630 | clean | *(empty)* | **YES** |
| **#10** | docs(performance): L33 load stress chaos package | [PR #10](https://github.com/ahmadpaiman0186-source/zora-walat/pull/10) | `main` | `l33-load-stress-chaos-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 8 | 630 | clean | *(empty)* | **YES** |
| **#11** | docs(operations): L34 failover drill package | [PR #11](https://github.com/ahmadpaiman0186-source/zora-walat/pull/11) | `main` | `l34-multi-region-failover-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 8 | 630 | clean | *(empty)* | **YES** |
| **#12** | docs(infrastructure): L35 reproducible infrastructure package | [PR #12](https://github.com/ahmadpaiman0186-source/zora-walat/pull/12) | `main` | `l35-iac-reproducible-infra-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 9 | 630 | clean | *(empty)* | **YES** |
| **#13** | docs(operations): L36 SLO error budget on-call package | [PR #13](https://github.com/ahmadpaiman0186-source/zora-walat/pull/13) | `main` | `l36-slo-error-budget-oncall-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 10 | 630 | clean | *(empty)* | **YES** |
| **#14** | docs(vendor): L37 provider fallback package | [PR #14](https://github.com/ahmadpaiman0186-source/zora-walat/pull/14) | `main` | `l37-vendor-sla-provider-fallback-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 8 | 630 | clean | *(empty)* | **YES** |
| **#15** | docs(security): L38 pentest compliance package | [PR #15](https://github.com/ahmadpaiman0186-source/zora-walat/pull/15) | `main` | `l38-security-pentest-compliance-docs` | ahmadpaiman0186-source | open | — | 2026-05-10 | 2026-05-10 | 9 | 630 | clean | *(empty)* | **YES** |
| **#16** | docs(governance): L39 release governance package | [PR #16](https://github.com/ahmadpaiman0186-source/zora-walat/pull/16) | `main` | `l39-release-governance-change-approval-docs` | ahmadpaiman0186-source | open | — | 2026-05-11 | 2026-05-11 | 9 | 630 | clean | *(empty)* | **YES** |
| **#17** | docs(operations): L40 post soft launch learning package | [PR #17](https://github.com/ahmadpaiman0186-source/zora-walat/pull/17) | `main` | `l40-post-soft-launch-learning-loop-docs` | ahmadpaiman0186-source | open | — | 2026-05-11 | 2026-05-11 | 9 | 630 | clean | *(empty)* | **YES** |

## Touch surfaces (summary)

| PR | Code | Docs | Evidence | Config/deploy | Payment/provider | DB/schema | Auth/security | Unproven claims risk |
|----|------|------|----------|---------------|------------------|-----------|---------------|---------------------|
| #5 | **YES** | — | — | health routes | **Stripe/webhook** | — | readiness | **YES** |
| #6–#17 | — | **YES** (`server/docs/**`) | — | — | thematic only (#14) | — | thematic (#8,#15) | **YES** (pre-Ap786) |

---

*End.*
