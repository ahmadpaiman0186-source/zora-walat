# L-49 — Read-only capture runbook (future L-50)

**Status:** Runbook **filed** — execution **NOT AUTHORIZED** until exact L-50 approval phrase is issued.

**Approval phrase:**

```
APPROVE L-50 MANUAL READ-ONLY OBSERVABILITY EVIDENCE CAPTURE ONLY
```

---

## Preconditions

1. L-48 dropzone exists and manifest is current.
2. Exact L-50 approval phrase recorded (see [CAPTURE_APPROVAL_PHRASE.md](./CAPTURE_APPROVAL_PHRASE.md)).
3. Operator has read [REDACTION_POLICY.md](../l46-operator-readonly-observability-evidence-collection-gate-2026-06-02/REDACTION_POLICY.md) and dropzone checklists.
4. Capture device cleared of unrelated sensitive tabs.

---

## Dropzone target

```
Ap786/evidence/l46-operator-readonly-observability-evidence-collection-gate-2026-06-02/operator-captured-redacted/
```

Manifest: [REQUIRED_EVIDENCE_MANIFEST.md](../l46-operator-readonly-observability-evidence-collection-gate-2026-06-02/operator-captured-redacted/REQUIRED_EVIDENCE_MANIFEST.md)

---

## L-50 capture steps (operator manual)

### Better Stack (read-only)

1. Open uptime monitor **details** → capture → save as `BETTERSTACK-UPTIME-MONITOR-DETAILS-001-redacted.png`
2. Open uptime **availability table** → capture → save as `BETTERSTACK-UPTIME-AVAILABILITY-TABLE-001-redacted.png`
3. Open **alert routing / notification channel** → capture → save as `BETTERSTACK-ALERT-ROUTING-CHANNEL-001-redacted.png`
4. Open **incident / acknowledgement** if available → capture → save as `BETTERSTACK-INCIDENT-ACKNOWLEDGEMENT-001-redacted.png` (or mark N/A in attestation)

### Vercel (read-only)

5. Open **production deployment status** → capture → save as `VERCEL-PRODUCTION-DEPLOYMENT-STATUS-001-redacted.png`
6. Run **production logs read-only query** → capture → save as `VERCEL-PRODUCTION-LOGS-READONLY-QUERY-001-redacted.png`

### Production health (read-only)

7. Capture **frontend health/availability** → `PRODUCTION-FRONTEND-HEALTH-AVAILABILITY-001-redacted.png`
8. Capture **API health/availability** → `PRODUCTION-API-HEALTH-AVAILABILITY-001-redacted.png`

### Money-path (if available)

9. Capture **money-path observability dashboard** → `MONEY-PATH-OBSERVABILITY-DASHBOARD-001-redacted.png` (or N/A with reason)

### Sign-off and attestations

10. File **SRE/operator sign-off** → `SRE-OPERATOR-SIGNOFF-001-redacted.md` or `.png`
11. Complete redaction checklist → save as `REDACTION-VERIFICATION-001.md`
12. Complete no-mutation template → save as `NO-MUTATION-ATTESTATION-001.md`

---

## Redaction (before dropzone save)

Redact: secrets, tokens, emails where not essential, sensitive internal IDs, logs with secrets, payment/customer PII, API keys, bearer tokens, webhook secrets, database URLs, provider credentials.

Use [REDACTION_BEFORE_COMMIT_CHECKLIST.md](../l46-operator-readonly-observability-evidence-collection-gate-2026-06-02/operator-captured-redacted/REDACTION_BEFORE_COMMIT_CHECKLIST.md).

---

## Forbidden during L-50

| Forbidden |
|-----------|
| Deploy / redeploy |
| Env / config / secret edits |
| DB mutation |
| Payment / order / wallet / provider mutation |
| Stripe replay / resend / test event |
| Webhook probe |
| Runtime Doctor mutation |
| Self-healing apply |
| Live transaction |
| Production or launch-ready claim |
| Printing secrets/tokens/passwords into evidence |
| Agent automation (unless separately authorized for intake only) |

---

## Stop/abort

Abort if any stop condition in L-49 gate Section 9 triggers. Do not commit unredacted files.

---

## Post-capture

1. Verify all manifest rows filed or N/A documented.
2. Do **not** upgrade readiness posture.
3. Request **L-47 retry intake** or **L-51** with separate approval.

---

## L-49 note

This runbook is **filed only** in L-49. **No capture was executed.**

---

*End of read-only capture runbook.*
