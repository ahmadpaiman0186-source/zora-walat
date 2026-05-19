# Super-System staging smoke & CI guard — proof

**Date:** 2026-05-19  
**Branch:** `fix/post-l40-slim-stripe-webhook-invalid-signature`  
**Sanitization:** No secrets, env values, keys, JWTs, PII, or raw webhook payloads.

---

## What CI now checks (every PR / push to main)

Workflow: `.github/workflows/super-system-guard.yml`

| Step | Command | Secrets required |
|------|---------|------------------|
| Secrets scan | `npm run secrets:scan` | No |
| Control plane | `npm run zw:doctor -- summary --strict --no-operator --no-staging` | No |
| Unit tests | `node --test test/zwDoctor.test.js` | No |
| Sanitizer tests | `node --test test/zwSanitizeReport.test.js` | No |

**Does not run:** refunds, payments, webhook resend, operator login, DATABASE_URL, live Stripe.

---

## What local staging smoke checks (operator-run)

```bash
cd server
npm run zw:smoke:staging
npm run zw:smoke:staging -- --write-artifact   # writes Ap786/smoke/latest-sanitized.json (gitignored)
```

| Check | When | If unavailable |
|-------|------|----------------|
| Deploy root guard | Always | WARN |
| zw-doctor `all` (staging health, static invariants) | Always | verdict in output |
| Operator `status-check` | `.staging-token.local` present | `PARTIAL_NOT_CONFIGURED` |
| Operator `phase1-truth-check` | token + `.staging-order-id.local` | `PARTIAL_NOT_CONFIGURED` |

**Never:** refund, payment, webhook resend, DB mutation.

---

## What is intentionally not automated

- L-12 partial refund proof  
- L-13 duplicate `charge.refunded` resend (checklist only — see `L13_DUPLICATE_REFUND_EVENT_SAFETY_CHECKLIST.md`)  
- Full `test:ci` integration DB suite (separate `ci.yml` job)  
- Production launch certification  
- Unattended money repair (`ZW_SELF_HEALING_APPLY` remains off)

---

## Sample output summary (static run, no operator token)

Typical CI-equivalent local check:

```text
ZW_STAGING_SMOKE_MONEY_MUTATIONS false
CHECK DEPLOY_ROOT_GUARD PASS deploy_guard_pass
CHECK ZW_DOCTOR_ALL PASS|PARTIAL verdict=...
CHECK OPERATOR_STATUS_CHECK PARTIAL_NOT_CONFIGURED token_file_missing
CHECK OPERATOR_PHASE1_TRUTH PARTIAL_NOT_CONFIGURED no_order_id_file
ZW_STAGING_SMOKE_VERDICT PASS
```

---

## How to run safely

1. **PR authors:** rely on Super-System Guard GitHub Action (no local secrets).  
2. **Operators:** configure `server/.env.local` + `.staging-token.local` locally only; never commit.  
3. **Evidence:** use enum-only lines from operator harness; archive sanitized JSON via `--write-artifact` if needed.

---

## Incident classification (operator)

After smoke, operators may run:

```bash
npm run zw:doctor -- incidents --json
```

See `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md` for approval phrases.

## Honest readiness note

**Control-plane CI guard added** — improves detection on every PR.  
**Incident response workflow added** — classification and approval gates only.  
**Not** “production fully certified.” Staging money-path L-8–L-11 proofs remain separate Ap786 evidence.

---

## No secrets confirmation

This document contains no API keys, DATABASE_URL, JWTs, or raw webhook payloads.
