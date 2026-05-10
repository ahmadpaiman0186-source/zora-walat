# L37 — Production provider proof checklist

Gate **live** Reloadly (and equivalent) production usage. This checklist is **documentation**; operators execute proof in controlled environments.

## Preconditions (L26–L36 lineage)

Carry forward prior layer gates as applicable on your branch (names illustrative — verify files exist before claiming closure):

| Layer | Dependency (conceptual) |
|-------|-------------------------|
| **L26** | Ready timeouts, bounded checks, production safety posture |
| **L27** | Dispute/webhook hardening awareness |
| **L28** | (Org-specific) — fraud/abuse or payment risk alignment if numbered in your program |
| **L29** | Observability: logs, metrics, alert routing **design** (no live mutation in L37) |
| **L30** | Support recovery taxonomy, manual recovery authority |
| **L31** | Security/compliance/fraud matrices |
| **L32** | Controlled soft launch / kill-switch planning |
| **L33** | Load/stress **plans** — proof runs are out of scope for L37 |
| **L34** | Failover / DR documentation — provider proof complements, not replaces |
| **L35** | Infra reproducibility, secret ownership |
| **L36** | SLO/error budget/on-call model for **internal** operations |

**Rule:** Missing any **blocking** predecessor gate defers live provider proof.

## Proof environment

| Attribute | Requirement |
|-----------|-------------|
| **Tier** | Staging or dedicated rehearsal project — **not** customer production |
| **Provider mode** | Sandbox first; live only in isolated burn-in with finance approval |
| **Data** | Synthetic or authorized test customers only |
| **Secrets** | Issued via secret manager; **no** `.env.local` in evidence packs |

## Proof owner

| Role | Responsibility |
|------|------------------|
| **Eng lead** | Executes technical drills, captures logs (redacted) |
| **Product/AM** | Confirms SKU scope and operator mapping |
| **Finance** | Approves live spend limits and refund policy alignment |
| **Security** | Confirms secret handling, access controls |

## Exact evidence required

- [ ] Sandbox golden path completed (`runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md`) — **PASS** recorded
- [ ] `npm run reloadly:sandbox-readiness` output attached (redacted) — **PASS**
- [ ] Operator map table for production SKUs (no secrets)
- [ ] Vendor SLA / support terms excerpt (`L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md`)
- [ ] Incident runbook walkthrough table top (`L37_PROVIDER_OUTAGE_AND_FALLBACK_RUNBOOK.md`) — tabletop signoff
- [ ] Reconciliation drill: sample “stuck” order exercise in staging — outcome documented

## Forbidden live-money actions without explicit approval

- Setting `RELOADLY_SANDBOX=false` in **customer** production
- Enabling `PHASE1_FULFILLMENT_OUTBOUND_ENABLED` for live traffic without dual control
- Enabling `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK` with `AIRTIME_PROVIDER=reloadly` in production (also **rejected at startup**)
- Disabling inquiry-before-retry or circuit breaker safeguards
- Running load/chaos drills against **live** provider endpoints

## Sandbox-first requirement

All **first** proofs complete in sandbox or mock as appropriate. Live proof is a **separate** line item with its own signoff.

## Live proof approval gate

| Gate | Required |
|------|----------|
| Executive or delegated **written** approval | Yes |
| Finance spend cap / rollback plan | Yes |
| Support staffing for incident window | Yes |
| Monitoring dashboard readiness (internal) | Yes |

## Rollback / abort criteria

- Spike in ambiguous provider outcomes above agreed threshold
- Auth or mapping errors > 0 on canary slice
- Vendor incident declared with unknown duration
- Any duplicate-send suspicion **before** root-cause containment

**Abort action:** disable new captures (product switch), halt retries cohort-wide, preserve logs.

## Post-proof reconciliation

- Within **24h** (or org SLA): reconciliation report — counts by outcome, refund/dispute tally, provider charges vs Stripe settlements (method per `FINANCE_TRUTH_AND_RECONCILIATION.md`).

## Signoff table

| Item | Owner | Status (PASS / FAIL / NOT VERIFIED / BLOCKED) | Date | Notes |
|------|-------|-----------------------------------------------|------|-------|
| Sandbox golden path | Eng | | | |
| Readiness script | Eng | | | |
| Operator map | Product | | | |
| SLA evidence | AM/Legal | | | |
| Safety gates review | Security | | | |
| Live promotion approval | Exec delegate | | | |

## Related

- [L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md](./L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md)
- [../PRODUCTION_MONEY_PATH_CHECKLIST.md](../PRODUCTION_MONEY_PATH_CHECKLIST.md)
- [../PHASE1_PRODUCTION_SAFETY_GATES.md](../PHASE1_PRODUCTION_SAFETY_GATES.md)
- [../runbooks/RELOADLY_PRODUCTION_REHEARSAL.md](../runbooks/RELOADLY_PRODUCTION_REHEARSAL.md)
