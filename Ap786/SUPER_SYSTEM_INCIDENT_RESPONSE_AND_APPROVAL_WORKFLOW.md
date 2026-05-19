# Super-System incident response & approval workflow

**Version:** 1.0.0 (2026-05-19)  
**Branch:** `fix/post-l40-slim-stripe-webhook-invalid-signature`  
**Classifier:** `server/tools/zwDoctor/incidents.mjs`  
**CLI:** `npm run zw:doctor -- incidents [--json] [--strict] [--ci-static]`

---

## Purpose

Detect incidents, classify severity, propose safe repairs, and **require explicit operator approval** before any dangerous action. **No unattended money repair.**

---

## Incident lifecycle

```text
Detect → Classify → Contain → Propose → Approve → Execute (human only) → Verify → Evidence → Close
```

| Stage | Actor | Automation |
|-------|-------|------------|
| Detect | zw-doctor / CI / smoke | Read-only |
| Classify | `incidents.mjs` | Yes |
| Contain | Operator | Manual |
| Propose | zw-doctor proposals | Propose-only |
| Approve | Operator written phrase | Required for HIGH/CRITICAL money actions |
| Execute | Operator / runbook | **Never** zw-doctor auto |
| Verify | status-check / l11-post-refund-verify | Read-only |
| Evidence | Ap786 sanitized docs | Manual archive |

---

## Approval gates

| Action class | Approval required | Example phrase |
|--------------|-------------------|----------------|
| Read-only diagnose | No | `Approved: run read-only staging smoke` |
| Deploy staging API | Yes | `Approved: deploy staging API from server root` |
| Webhook resend (test mode) | Yes | `Approved: resend duplicate charge.refunded event for L-13 proof` |
| Test-mode refund (specific order) | Yes | `Approved: execute test-mode refund for specific order` |
| Fulfillment freeze | Yes | `Approved: freeze fulfillment provider integration` |
| Refund / payment / DB mutation | Yes | Exact L11/L13 phrases in Ap786 plans |

**zw-doctor will throw** if asked to auto-run actions matching dangerous patterns (`l11-refund-execute`, `webhook_resend`, etc.) via `assertNoDangerousAutoRepair`.

---

## Sample operator approval phrases (do not execute from this doc)

- `Approved: resend duplicate charge.refunded event for L-13 proof`
- `Approved: deploy staging API from server root`
- `Approved: freeze fulfillment provider integration`
- `Approved: run read-only staging smoke`
- `Approved: execute test-mode refund for specific order`

Record approval in ticket/chat with date and operator initials. **No secrets in approval text.**

---

## Forbidden actions (global)

- Unattended refund execution  
- Unattended checkout / payment creation  
- Unattended Stripe webhook resend  
- Production or staging **money state** mutation by automation  
- `ZW_SELF_HEALING_APPLY=true` without payment-safety sign-off  
- Committing `.env`, tokens, or Stripe keys  

---

## Containment playbooks (immediate)

| Severity | Action |
|----------|--------|
| CRITICAL money | Freeze fulfillment kicks; read-only phase1-truth; escalate on-call |
| CRITICAL secrets | Block merge; rotate credentials; re-run secrets:scan |
| HIGH deploy | Stop deploy; run `deploy:staging:guard` from `server/` |
| HIGH staging down | No Stripe tests until `/api/health` 200 |

---

## Rollback playbooks

| Incident | Rollback hint |
|----------|----------------|
| Wrong deploy | Redeploy last known-good server build from `server/` |
| Bad migration | Roll back deploy; forward-fix migration in new commit |
| Secrets in git | Revert commit; rotate keys; clean history per security policy |
| Refund overreach | **No** auto second refund — payment-safety investigation only |

---

## Evidence checklist

- [ ] Enum-only operator output (no raw ids in git)  
- [ ] Incident id + severity recorded  
- [ ] Approval phrase quoted (if dangerous action taken)  
- [ ] Before/after status-check or l11-post-refund-verify  
- [ ] `npm run zw:doctor -- incidents --json` archived locally (gitignored smoke JSON optional)  
- [ ] No secrets, payloads, or PII in Ap786 files  

---

## Detection commands

```bash
cd server
npm run zw:doctor -- incidents
npm run zw:doctor -- incidents --json --no-operator --no-staging
npm run zw:doctor -- incidents --strict    # exit 1 if HIGH/CRITICAL active
npm run zw:smoke:staging                   # operator optional
```

---

## Taxonomy reference

21 incident types in `INCIDENT_TAXONOMY` (money + system). Each defines:

- severity (LOW / MEDIUM / HIGH / CRITICAL)  
- confidence signals  
- detection command  
- safe immediate action  
- proposed repair  
- approval_required  
- forbidden_actions  
- evidence_required  
- rollback_hint  

---

## CI guard (static profile)

GitHub Actions `super-system-guard.yml` runs:

```bash
npm run zw:doctor -- incidents --strict --ci-static
```

`--ci-static` implies `--no-operator` and `--no-staging`. It suppresses env-local incidents (missing local Stripe key, operator token, staging health) so CI does not fail on expected absent secrets. **HIGH/CRITICAL** static incidents (secrets scan, live key in repo, deploy root, money-path invariants) still fail the job.

---

## No unattended money repair

Phase 1 policy: **webhook mirror only** for refunds; fulfillment requires server-confirmed PAID. zw-doctor and CI **propose** only. Money-moving execution remains with operator harness + explicit approval strings (`L11_REFUND_APPROVAL`, L-13 phrase, etc.).

---

## Honest readiness

Incident response workflow **added** — does **not** mean production is fully certified or self-healing in production.
