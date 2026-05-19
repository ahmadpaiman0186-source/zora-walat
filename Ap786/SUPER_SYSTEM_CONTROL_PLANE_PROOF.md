# Super-System Control Plane — Proof (sanitized)

**Date:** 2026-05-19  
**Branch:** `fix/post-l40-slim-stripe-webhook-invalid-signature`  
**CLI:** `server/tools/zw-doctor.mjs` v1.0.0  
**Architecture:** `SUPER_SYSTEM_CONTROL_PLANE_ARCHITECTURE.md`

---

## What this is

A **diagnostic and proposal** control plane foundation. It improves detection, classification, and operator clarity for Zora-Walat’s money path and deployment surface.

## What this is not

- **Not** unattended money repair  
- **Not** autonomous production recovery  
- **Not** a replacement for Ap786 staging proofs (L-1…L-11)  
- **Not** full CI/staging smoke automation yet (foundation only)

---

## Incident response (v1.1)

```bash
npm run zw:doctor -- incidents
npm run zw:doctor -- incidents --json --no-operator --no-staging
npm run zw:doctor -- incidents --strict   # exit 1 if HIGH/CRITICAL active
npm run zw:doctor -- incidents --strict --ci-static   # CI profile (suppresses env-local MEDIUM)
```

Classifier: `server/tools/zwDoctor/incidents.mjs` — 21 incident types, propose-only runbooks.  
Workflow doc: `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md`.

## Safety confirmations

| Check | Result |
|-------|--------|
| Refunds executed by zw-doctor | **No** |
| Payments created | **No** |
| Webhooks resent | **No** |
| Production data mutated | **No** |
| Auto-repair executed | **No** |
| Raw secrets in output | **No** (redaction + tests) |

---

## Commands

```bash
cd server
npm run zw:doctor -- summary
npm run zw:doctor -- all
npm run zw:doctor -- all --json
npm run zw:doctor -- money-path --no-operator
npm run zw:doctor -- deploy-root
```

Modes: `summary`, `money-path`, `stripe-env`, `webhook`, `operator-auth`, `frontend-env`, `deploy-root`, `evidence`, `incidents`, `all`.

---

## Tests

Focused unit tests: `server/test/zwDoctor.test.js`

- PASS invariant verdict  
- BLOCKED Stripe key proposal  
- CRITICAL unpaid fulfillment proposal  
- CRITICAL duplicate fulfillment proposal  
- Refund/incident stale proposal  
- Deploy-root proposal  
- Secret redaction  
- JSON invariant shape  

Run: `node --test test/zwDoctor.test.js` from `server/`.

---

## Relationship to global audit

| Global audit finding | Control plane response |
|----------------------|-------------------------|
| 68% weighted readiness | Deterministic `zw-doctor` baseline |
| No unified CLI | **Addressed** (v1) |
| Auto-repair gated off | Proposals only; `ZW_SELF_HEALING_APPLY` unchanged |
| L-12/L-13 pending | Not executed by CLI |

---

## Next steps (operator)

1. Run `npm run zw:doctor -- all --json` after material changes; archive sanitized JSON under Ap786 if needed.  
2. Add PR CI: `zw-doctor summary --strict` + `secrets:scan`.  
3. Execute L-12/L-13 via operator harness when approved — not via zw-doctor.
