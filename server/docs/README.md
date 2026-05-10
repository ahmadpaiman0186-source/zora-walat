# Server documentation index

## Vendor SLA / provider fallback (L37)

| Document | Purpose |
|----------|---------|
| [vendor/L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md](./vendor/L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md) | Scope, dependency map, modes, fallback model, kill-switch, NO-GO |
| [vendor/L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md](./vendor/L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md) | Evidence before live provider use, redaction, PASS/FAIL model |
| [vendor/L37_PROVIDER_FALLBACK_DECISION_MATRIX.md](./vendor/L37_PROVIDER_FALLBACK_DECISION_MATRIX.md) | Scenario matrix: detection, severity, fallback, money-path risk |
| [vendor/L37_VENDOR_RISK_REGISTER.md](./vendor/L37_VENDOR_RISK_REGISTER.md) | Vendor dependency risks, mitigations, owners |
| [vendor/L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md](./vendor/L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md) | Production proof gates, signoff table, sandbox-first |
| [runbooks/L37_PROVIDER_OUTAGE_AND_FALLBACK_RUNBOOK.md](./runbooks/L37_PROVIDER_OUTAGE_AND_FALLBACK_RUNBOOK.md) | Outage/latency/auth/quota/stuck/duplicate procedures |

## Related (implementation and money path)

| Document | Purpose |
|----------|---------|
| [L21_PROVIDER_FALLBACK.md](./L21_PROVIDER_FALLBACK.md) | Implemented multi-provider / mock fallback policy |
| [PHASE1_PRODUCTION_SAFETY_GATES.md](./PHASE1_PRODUCTION_SAFETY_GATES.md) | Production startup gates (mock, fallback flags) |
| [PRODUCTION_MONEY_PATH_CHECKLIST.md](./PRODUCTION_MONEY_PATH_CHECKLIST.md) | Launch checklist before live customers |
| [PHASE1_REFUND_AND_DISPUTE.md](./PHASE1_REFUND_AND_DISPUTE.md) | Stripe refund/dispute alignment |
| [FINANCE_TRUTH_AND_RECONCILIATION.md](./FINANCE_TRUTH_AND_RECONCILIATION.md) | Reconciliation expectations |
| [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) | Secret handling (no values in docs) |

## Runbooks

| Document | Purpose |
|----------|---------|
| [runbooks/README.md](./runbooks/README.md) | Runbook index and first-response table |
| [runbooks/RELOADLY_PRODUCTION_REHEARSAL.md](./runbooks/RELOADLY_PRODUCTION_REHEARSAL.md) | Sandbox vs prod boundary, preflight |
| [runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md](./runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md) | Bounded sandbox drill |
