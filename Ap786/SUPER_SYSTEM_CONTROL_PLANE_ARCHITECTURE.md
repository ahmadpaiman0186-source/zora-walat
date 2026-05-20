# Zora-Walat Super-System Control Plane — Architecture

**Version:** 1.0.0 (2026-05-19)  
**CLI entry:** `server/tools/zw-doctor.mjs` (`npm --prefix server run zw:doctor`)  
**Sanitization:** No secrets, PII, or raw webhook payloads in output.

---

## Purpose

Provide a **deterministic diagnostic layer** that maps Zora-Walat’s money path, webhooks, deployment surface, frontend trust copy, and operator tooling into **structured invariant results** and **propose-only repair plans** — without executing refunds, payments, webhook resends, or production database mutations.

This closes the gap identified in `SUPER_SYSTEM_GLOBAL_ENGINEERING_AUDIT_2026_03_28_TO_2026_05_19.md`: strong primitives existed, but no unified control plane.

---

## Safety model

| Rule | Enforcement |
|------|-------------|
| No refunds | CLI never calls `l11-refund-execute` |
| No payments | CLI never calls `checkout` / `create-checkout-session` |
| No webhook resend | No Stripe API or Dashboard automation |
| No production DB writes | Read-only probes; optional `status-check` enum parse only |
| No secret printing | `redact.mjs` + proposal assertion tests |
| Money repair | **approval_required** + `forbidden_auto` on CRITICAL money proposals |

---

## Inputs

- Repository file presence (gates, slim handlers, tests, Ap786 evidence)
- Local `server/.env` / `.env.local` via operator dotenv loader (**modes only, never printed**)
- `npm run secrets:scan` (subprocess)
- `assert-vercel-api-deploy-root.mjs` (subprocess, run from `server/`)
- Optional HTTP `GET {ZW_STAGING_API_BASE}/api/health` (default staging API host)
- Optional operator `status-check` (read-only; requires `.staging-token.local`)

### CLI flags

| Flag | Effect |
|------|--------|
| `--json` | Machine-readable report |
| `--strict` | Exit code 1 on CRITICAL or BLOCKED verdict |
| `--no-staging` | Skip staging HTTP health probe |
| `--no-operator` | Skip `status-check` subprocess |

---

## Outputs

### Human report

- Per-invariant: `status`, `id`, `confidence`, `evidence`, `risk`, `next`, `approval_required`
- Repair proposals: `classification`, `action_mode`, `danger`, `steps`

### JSON report

```json
{
  "version": "1.0.0",
  "mode": "all",
  "verdict": "PASS|WARN|PARTIAL|BLOCKED|CRITICAL",
  "invariants": [ { "id", "status", "confidence", "evidence", "risk", "proposed_next_action", "approval_required" } ],
  "proposals": [ { "id", "title", "classification", "action_mode", "danger", "approval_required", "steps" } ],
  "summary": { "PASS": 0, "WARN": 0, "...": 0, "total": 0 },
  "safety": { "refunds_executed": false, "payments_created": false, "webhooks_resent": false, "production_data_mutated": false }
}
```

---

## Failure levels

| Level | Meaning |
|-------|---------|
| **PASS** | Invariant satisfied with high confidence |
| **WARN** | Degraded or environmental; not blocking staging work |
| **PARTIAL** | Design/test evidence present; live proof incomplete |
| **BLOCKED** | Cannot proceed safely until fixed (config/deploy) |
| **CRITICAL** | Money-path integrity risk — human investigation only |
| **NOT_IMPLEMENTED** | Probe intentionally skipped (e.g. signed webhook POST) |

---

## Action modes

| Mode | Description |
|------|-------------|
| `diagnose_only` | Report only (default) |
| `propose_repair` | Emit steps; operator executes |
| `safe_local_fix` | Local hygiene (e.g. unstage `.env`) — still manual |
| `approval_required` | Deploy, webhook resend, money investigation |
| `forbidden` | Auto execution must not run (e.g. live key in staging) |

---

## Invariant categories

1. **money_path** — paid-before-fulfill, webhook authority, mapping, refund safety  
2. **frontend** — CTA guards, customer copy, error messages  
3. **config_security** — Stripe mode, secrets scan, deploy root  
4. **operational** — staging health, operator token, evidence index  

See `server/tools/zwDoctor/invariants.mjs` for IDs.

---

## Approval gates

| Action | Gate |
|--------|------|
| Full/partial refund | `L11_REFUND_APPROVAL` exact phrase (operator harness only) |
| Webhook Dashboard resend | Written operator approval per Ap786 L-4/L-13 |
| Staging/production deploy | `npm run deploy:staging:guard` + human deploy |
| Money-path investigation | `approval_required: true` on CRITICAL proposals |

`zw-doctor` never bypasses these gates.

---

## Evidence model

- Each run is **point-in-time**; capture `zw-doctor all --json` output in Ap786 when closing proofs.
- Enum-only operator lines remain the source of truth for money state.
- Index: `AP786_EVIDENCE_INDEX.txt` — add row when control plane lands.

---

## Future CI integration

| Stage | Command |
|-------|---------|
| PR hygiene | `npm run secrets:scan` + `zw-doctor summary --strict` |
| Pre-deploy | `zw-doctor deploy-root --strict` from `server/` |
| Nightly staging | `zw-doctor all --no-operator` + synthetic health |
| Post-L11 | `zw-doctor money-path` with approved operator token (optional) |

---

## What it will NOT do automatically

- Execute refunds or create checkouts  
- Resend Stripe webhooks or call Stripe money APIs  
- Mutate `PaymentCheckout` or fulfillment rows  
- Apply `ZW_SELF_HEALING_APPLY` repairs  
- Claim production launch readiness  
- Replace integration test suite (`test:ci`)

---

## Module layout

```
server/tools/zw-doctor.mjs          # CLI entry
server/tools/zwDoctor/
  types.mjs                         # Invariant + report types
  redact.mjs                        # Secret redaction
  invariants.mjs                    # Invariant runners
  proposals.mjs                     # Proposal engine
  run.mjs                           # Orchestration + output
server/test/zwDoctor.test.js        # Unit tests
```

Wraps existing tools: `stagingOperatorL11StripeKey.mjs`, `stagingOperatorAuthEnv.mjs`, `assert-vercel-api-deploy-root.mjs`, `secret-scan.mjs`, `staging-auth-checkout-operator.mjs` (status-check only).

Incident classifier: `zwDoctor/incidents.mjs` — `npm run zw:doctor -- incidents`. See `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md`.
