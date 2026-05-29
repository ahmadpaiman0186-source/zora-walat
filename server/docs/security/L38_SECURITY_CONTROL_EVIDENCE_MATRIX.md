# L38 — Security control evidence matrix

Map **control objectives** to **implementation hints** and **evidence** expected for audits. Status is per environment; default for a new program is **NOT VERIFIED** until evidence is collected.

**Status model:** `PASS` | `FAIL` | `NOT VERIFIED` | `BLOCKED`

| Control area | Control objective | Implementation / evidence source | Required evidence | Owner | Status | Launch blocking | Remediation owner |
|--------------|-------------------|----------------------------------|-------------------|-------|--------|-----------------|-------------------|
| **Authentication** | Only legitimate users obtain sessions | Auth routes, password/OTP flows in `server/src` | Test results, auth flow diagram, lockout policy | AppSec + Eng | NOT VERIFIED | Yes if bypass exists | Eng |
| **Authorization** | Users access only their resources | Route guards, admin separation | IDOR test notes (redacted), role matrix | AppSec + Eng | NOT VERIFIED | Yes | Eng |
| **JWT / session handling** | Tokens validated; safe lifetimes | JWT middleware, refresh handling | Config review, sample decoded claims (redacted) | Eng | NOT VERIFIED | Yes | Eng |
| **OTP transport** | OTP not leaked via logs/errors | OTP service, error messages | Log review, error taxonomy | Eng | NOT VERIFIED | Yes | Eng |
| **CORS** | No wildcard credentialed abuse | `CORS_ORIGINS`, edge config | Prod CORS snapshot (redacted origins list OK) | Platform | NOT VERIFIED | Medium | Platform |
| **Rate limiting** | Abuse slowed on sensitive routes | `RATE_LIMITING.md`, middleware | Metrics/alerts showing limiters active | SRE | NOT VERIFIED | Medium | Eng |
| **Stripe webhook signature** | Only Stripe can trigger handlers | Webhook raw body + signature verify | Code review + test hook logs (redacted) | Eng | NOT VERIFIED | **Yes** | Eng |
| **Idempotency** | Duplicate webhooks don’t double-apply | `PHASE1_IDEMPOTENCY_CONTRACT.md`, DB uniqueness | DB schema + replay test result | Eng | NOT VERIFIED | **Yes** | Eng |
| **Ledger immutability** | Financial records not casually altered | Ledger docs, migration policy | Change audit, no ad-hoc prod SQL policy | Finance + Eng | NOT VERIFIED | **Yes** | Eng |
| **Reconciliation** | Internal vs external truth detectable | Reconciliation endpoints/docs | Sample reconciliation report (redacted) | Eng + Finance | NOT VERIFIED | Yes | Eng |
| **Provider fulfillment safety** | No silent double-send; safe retry | `L21_PROVIDER_FALLBACK.md`, adapter code | Inquiry/retry policy review | Eng | NOT VERIFIED | **Yes** | Eng |
| **Secrets management** | Secrets not in repo; rotated | `SECRETS_MANAGEMENT.md`, secret store | Access logs (redacted), rotation tickets | Security | NOT VERIFIED | **Yes** | Platform |
| **Environment separation** | Prod vs staging vs dev isolation | Deploy config, DB URLs naming | Env inventory, network diagram | Platform | NOT VERIFIED | Yes | Platform |
| **Logging / audit** | Security events attributable; PII minimized | Logging redact config, audit events | Sample logs with redaction proof | SRE | NOT VERIFIED | Medium | Eng |
| **Privacy / data handling** | Lawful basis, retention, DSAR path | Privacy policy linkage, data map | ROPA/diagram (org-specific) | DPO | NOT VERIFIED | Medium | Legal |
| **Fraud / abuse response** | Known abuse scenarios have runbooks | `ABUSE_HARDENING_MATRIX.md` | Tabletop notes | Trust & Safety | NOT VERIFIED | Medium | Eng |
| **Incident response** | Security incidents triaged | `PHASE1_INCIDENT_PLAYBOOK.md`, on-call | IR tabletop record | SecOps | NOT VERIFIED | Medium | SecOps |
| **Backup / restore** | Data recoverable within targets | `L25_BACKUP_RESTORE_READINESS.md`, `runbooks/BACKUP_RESTORE_DRILL.md` | Backup job config names + drill outcome | Platform | NOT VERIFIED | Yes | Platform |
| **Readiness / health checks** | Unsafe deploys blocked | `/ready`, startup gates | Health check output, gate unit tests | SRE | NOT VERIFIED | Medium | Eng |

## Related

- [L38_COMPLIANCE_AUDIT_EVIDENCE_REQUEST_LIST.md](./L38_COMPLIANCE_AUDIT_EVIDENCE_REQUEST_LIST.md)
- [L38_LAUNCH_BLOCKING_SECURITY_FINDINGS_POLICY.md](./L38_LAUNCH_BLOCKING_SECURITY_FINDINGS_POLICY.md)
