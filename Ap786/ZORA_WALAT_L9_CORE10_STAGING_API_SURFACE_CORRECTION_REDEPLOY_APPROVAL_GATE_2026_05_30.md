# L-9 — CORE-10 Staging API Surface Correction / Redeploy Approval Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-9** — Staging API Surface Correction / **Redeploy Approval Gate** (policy only)  
**Branch (this pack):** `docs/l9-core10-staging-api-surface-correction-redeploy-approval-gate-2026-05-30`  
**Base:** `69906b0` — Merge PR #123 (L-8 token/API verify)  

---

## 1. L-step identity

| Field | Value |
|-------|-------|
| L-step | **L-9** |
| Title | CORE-10 Staging API Surface Correction / Redeploy Approval Gate |
| Date | 2026-05-30 |
| PR #123 / L-8 | [L-8 verify evidence](./ZORA_WALAT_L8_CORE10_TOKEN_REFRESH_API_BASE_VERIFY_EVIDENCE_2026_05_30.md) — smoke **FAIL**, hosted API = frontend surface |
| L-9 role | Define **future L-10** redeploy boundary — **no** deploy, Vercel mutation, or runtime action in L-9 |

---

## 2. Mission

Define a **fail-closed approval gate** for future **staging API surface correction** via exactly one **API redeploy from `server/` scope** after L-8 proved local layout is correct but **hosted** URL serves Next.js 404 HTML.

Preserve audit-ready posture and **prevent** accidental production deploy, Vercel settings/env mutation, or conflation with full snapshot export (separate authorization).

**This L-9 task is NOT:**
- Authorization to deploy or redeploy  
- Authorization to edit Vercel settings, project mapping, or env vars  
- Authorization to access production/live systems  

**This L-9 task IS:**
- Documentation / governance / approval-gate only  

---

## 3. Scope

| In scope | Out of scope |
|----------|----------------|
| L-9 approval gate policy | `vercel deploy` execution |
| L-10 phrase definition (reference only) | Vercel dashboard changes |
| Future L-10 allowed/prohibited lists (define only) | Env / `.env*` edits |
| Vercel/deploy safety + health rules | Token refresh / login |
| Risk register, go/no-go matrix | Full staging snapshot export |
| CORE10-L10-* artifact IDs (pending) | Stripe / Reloadly / DB mutation |

---

## 4. Why this gate exists (L-8 findings)

| Observation | Implication |
|-------------|-------------|
| `staging-api-smoke` → **FAIL** | `route_missing_or_wrong_deployment` |
| `API_SURFACE_LIKELY=nextjs_frontend` | Staging hostname serves **frontend**, not API |
| `/api/health` → HTTP **404** HTML | Not JSON `{ status: ok }` |
| Local `deploy:staging:guard` → **PASS** | Repo `server/` API layout is **correct** |
| L-6/L-8 token + status-check | Blocked until API surface fixed |
| **CORE10-BLK-CAPTURE-001** | Full snapshot **OPEN** |
| Runtime Doctor / observability | **NOT VERIFIED** |

Redeploy from **`server/` only** (when L-10 approved) is the documented correction path — not frontend root deploy.

---

## 5. Future L-10 authorization phrase (policy only — NOT L-9 authorization)

```
APPROVE L-10 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY
```

| Rule | L-9 session |
|------|-------------|
| Phrase in this document | **NOT** operator authorization |
| L-9 executes redeploy? | **NO** |
| L-9 mutates Vercel? | **NO** |

---

## 6. Future authorized L-10 actions (DEFINE ONLY — NOT EXECUTED)

After **separate** L-10 operator authorization:

| # | Action | Notes |
|---|--------|-------|
| L10-1 | Verify Vercel **staging API** project target + branch/deployment mapping (redacted notes) | CORE10-L10-VERCEL-TARGET-001 |
| L10-2 | Confirm `server/` root, `vercel.json` API routes, `api/index.mjs` | Align with guard |
| L10-3 | Run `npm run deploy:staging:guard` from `server/` | CORE10-L10-PREDEPLOY-GUARD-001 |
| L10-4 | **Exactly one** staging API `vercel deploy` from `server/` scope if approved | CORE10-L10-REDEPLOY-001 — **not** production |
| L10-5 | **No** env var edits unless **separately** approved | Default **forbidden** |
| L10-6 | Read-only post-deploy `staging-api-smoke` | CORE10-L10-SMOKE-001 |
| L10-7 | Verify `GET /api/health` → API JSON **200** | CORE10-L10-HEALTH-001 |
| L10-8 | File redacted deploy/smoke transcript | No secrets |
| L10-9 | Update blocker register; evidence PR | Conservative |
| L10-10 | **Do not** run full snapshot export in L-10 unless **separately** authorized | Narrow scope |

---

## 7. Prohibited actions (always — including after L-10 unless separately approved)

| # | Prohibited |
|---|------------|
| P1 | Production deploy / live-mode operation |
| P2 | Env / config / secret edits (default) |
| P3 | Stripe replay / resend / test event |
| P4 | Reloadly / provider execution |
| P5 | DB mutation / migrations |
| P6 | Payment / order / wallet mutation |
| P7 | Full staging snapshot export |
| P8 | Token printing / token in docs |
| P9 | Self-healing / auto-repair apply |
| P10 | Broad endpoint probing beyond smoke + health |
| P11 | Uncontrolled Vercel dashboard changes |
| P12 | Manual commands outside documented L-10 runbook |

---

## 8. Required future L-10 evidence artifacts

| ID | Artifact | L-9 status |
|----|----------|------------|
| **CORE10-L10-AUTH-001** | L-10 authorization (verbatim phrase + DR) | **PENDING** |
| **CORE10-L10-PREDEPLOY-GUARD-001** | `deploy:staging:guard` output | **PENDING** |
| **CORE10-L10-VERCEL-TARGET-001** | Target project verification (redacted) | **PENDING** |
| **CORE10-L10-REDEPLOY-001** | Exactly-one redeploy evidence | **PENDING** |
| **CORE10-L10-HEALTH-001** | `/api/health` JSON 200 class | **PENDING** |
| **CORE10-L10-SMOKE-001** | `staging-api-smoke` PASS | **PENDING** |
| **CORE10-L10-NO-MUTATION-001** | No DB/payment/provider mutation | **PENDING** |
| **CORE10-L10-ROLLBACK-001** | Rollback/abort path documented | **PENDING** |
| **CORE10-L10-VERDICT-001** | Conservative verdict | **PENDING** |

---

## 9. Vercel / deploy safety rules

| Rule | Requirement |
|------|-------------|
| Project | **Staging API** project only — not production alias |
| Source | `cd server` — monorepo root deploy **forbidden** (guard blocks) |
| Command class | Deploy-only — **not** `vercel env` / settings UI edits |
| Production alias | **Must not** mutate |
| Live secrets | **Must not** use on staging deploy shell |
| DB migrations | **Must not** run as part of deploy step |
| Payment/provider/webhook | **Must not** execute |
| Deployment URL in evidence | Redacted label if filed |
| Stop if | Vercel prompts production deployment, env edit, ambiguous project |

**Documented deploy hint (L-10 only, not L-9):** from `server/`: `vercel deploy --prod --yes` per guard script hint — **only** after L-10 phrase.

---

## 10. API health verification rules

| Outcome | Classification |
|---------|----------------|
| JSON body, liveness OK, HTTP 2xx | **SUCCESS** (record status + `response_class=api_json` only) |
| HTML, Next.js 404, frontend page | **FAIL** (L-8 observed) |
| Redirect to marketing site | **FAIL** |
| Auth wall without prior token step | **INCONCLUSIVE** — do not claim PASS |

**Do not** paste sensitive headers or tokens. **No** broad probing beyond health + approved smoke.

---

## 11. Abort rules (future L-10)

| # | Condition |
|---|-----------|
| A1 | Target Vercel project unclear |
| A2 | Command targets production/live project |
| A3 | Env/config edit requested mid-flow |
| A4 | DB / payment / provider write appears |
| A5 | Production alias would change |
| A6 | Secret in terminal output |
| A7 | Rollback path unclear |
| A8 | Evidence cannot be redacted |
| A9 | Operator halts — document abort, no false PASS |

---

## 12. Go / no-go matrix

| Gate | L-9 (this pack) | Future L-10 redeploy | Token retry (L-8 follow-up) | Full snapshot | Today |
|------|-----------------|----------------------|----------------------------|---------------|-------|
| L-9 approval gate filed | **GO** (when merged) | Prerequisite | — | — | **IN PROGRESS** |
| L-10 staging API correction | **N/A** | Requires phrase | After L-10 PASS | — | **NO-GO** |
| Hosted API JSON health | **N/A** | CORE10-L10-HEALTH-001 | — | — | **NO-GO** |
| Full read-only snapshot | **N/A** | **N/A** | After API+token | Separate auth | **NO-GO** |
| Runtime Doctor staging proof | **N/A** | Prerequisite hint | — | Needs data | **NOT VERIFIED** |
| Observability proof | **N/A** | — | — | Needs data | **NOT VERIFIED** |
| NPNS / duplicate (live) | **N/A** | — | — | Hard evidence | **NO-GO** |
| Production / real-money / pilot / market | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** |

---

## 13. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| L9-R-01 | Accidental production deploy | L-10 project checklist; abort |
| L9-R-02 | Wrong Vercel project target | CORE10-L10-VERCEL-TARGET-001 |
| L9-R-03 | Staging API still maps to frontend | Post-deploy smoke + health JSON |
| L9-R-04 | Env/secret exposure in logs | Redact; abort on secret print |
| L9-R-05 | Accidental env/config mutation | L-10 default forbid |
| L9-R-06 | False API health proof (HTML 404) | Response class rules §10 |
| L9-R-07 | Stale deployment evidence | Timestamp + smoke after deploy |
| L9-R-08 | Rollback ambiguity | CORE10-L10-ROLLBACK-001 |
| L9-R-09 | Vercel preview vs staging API confusion | Host labels; smoke diagnosis enums |
| L9-R-10 | False production-ready claim | Conservative verdict §14 |
| L9-R-11 | L-10 phrase misinterpretation | §5 |

**Risks introduced by L-9:** **None** (Ap786 only).

---

## 14. Dependencies

| Dependency | Status |
|------------|--------|
| PR #123 (L-8) merged | **DONE** |
| PR #118–#122 (L-3..L-7) | **DONE** |
| Clean `main` at L-10 execution | Required future |
| Future L-10 verbatim phrase | **PENDING** |
| Vercel staging API project mapping knowledge | Operator-held |
| Rollback/abort plan (L-10 evidence) | **PENDING** |
| [Redaction policy](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) | **FILED** |
| `staging-api-smoke` command | **AVAILABLE** (read-only) |
| No open incident elevating risk | Program attestation |

---

## 15. Rollback / cleanup plan

| Scenario | Action |
|----------|--------|
| L-9 docs error | `git revert` L-9 PR — docs only |
| L-9 runtime rollback | **N/A** — no runtime action |
| Future L-10 bad deploy | Prior deployment promotion / Vercel rollback per operator runbook — filed in CORE10-L10-ROLLBACK-001 |
| Secret in output | Stop; rotate; do not commit |

---

## 16. Super-System invariants (preserved)

| Invariant | Status |
|-----------|--------|
| Zero duplicate transaction (live) | **Not fully proven** |
| No-pay-no-service (live) | **Not fully proven** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

---

## 17. L-9 session attestations

| # | Attestation | Status |
|---|-------------|--------|
| S1 | Ap786 approval gate only | **YES** |
| S2 | No deploy / redeploy / `vercel deploy` | **YES** |
| S3 | No Vercel settings/env mutation | **YES** |
| S4 | No token refresh / token print | **YES** |
| S5 | No full snapshot export | **YES** |
| S6 | L-10 phrase **not** granted in L-9 | **YES** |
| S7 | No external mutation | **YES** |

---

## 18. Final conservative verdict

| Item | Verdict |
|------|---------|
| L-9 approval gate | **FILED** |
| Staging API redeploy | **NOT EXECUTED** |
| Vercel mutation | **NO** |
| Env/config mutation | **NO** |
| Token refresh | **NOT EXECUTED** |
| Full snapshot export | **NOT EXECUTED** |
| System mutation | **NO** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production readiness | **NO-GO** |
| Real-money readiness | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Market launch | **NO-GO** |

**Canonical sentence:**

> L-9 approval gate: **FILED**. Staging API redeploy: **NOT EXECUTED**. Vercel mutation: **NO**. Env/config mutation: **NO**. Token refresh: **NOT EXECUTED**. Full snapshot export: **NOT EXECUTED**. System mutation: **NO**. Runtime Doctor staging proof: **NOT VERIFIED**. Observability proof: **NOT VERIFIED**. Production / real-money / controlled pilot / market launch: **NO-GO**.

---

## 19. Related documents

| Document | Role |
|----------|------|
| [L-8 verify](./ZORA_WALAT_L8_CORE10_TOKEN_REFRESH_API_BASE_VERIFY_EVIDENCE_2026_05_30.md) | PR #123 — smoke FAIL |
| [L-7 gate](./ZORA_WALAT_L7_CORE10_TOKEN_REFRESH_API_BASE_APPROVAL_GATE_2026_05_30.md) | Token/API policy |
| [STR02 404 fix matrix](./ZORA_WALAT_STR02_404_FIX_OPTION_MATRIX_2026_05_24.md) | Historical routing context |

---

*End of L-9 approval gate.*
