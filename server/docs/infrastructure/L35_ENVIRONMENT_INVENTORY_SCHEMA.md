# L35 — Environment inventory schema

**Use:** One row per **logical** environment (local, preview template, staging, production). **Never** paste secret values.

**Status values:** `PASS` | `FAIL` | `NOT VERIFIED` | `BLOCKED`

---

## Inventory template (copy per environment)

| Field | Description / example |
|-------|------------------------|
| **environment_name** | e.g. `production`, `staging`, `preview-pr-123` |
| **owner** | Team/person accountable |
| **purpose** | Live / QA / demo |
| **vercel_project** | e.g. `zora-walat` (web) vs `server` (API) per root README |
| **deployment_url** | Canonical deploy URL pattern (no tokens in doc) |
| **api_url** | HTTPS API base |
| **frontend_url** | Public web origin |
| **database_provider** | e.g. Neon |
| **database_role** | Primary / branch / read replica |
| **redis_queue_provider** | e.g. Upstash, Redis Cloud, self-hosted |
| **stripe_mode** | test / live |
| **webhook_endpoint** | Path `/webhooks/stripe` + registered host |
| **reloadly_mode** | sandbox / live (`RELOADLY_SANDBOX`) |
| **dns_domain** | Apex + API subdomain ownership |
| **observability_sink** | Log vendor (when L29 wired) |
| **alert_route** | Pager/email (when wired) |
| **backup_restore** | Link to L25 evidence / Neon snapshot policy |
| **access_owner** | Who can open Vercel/Neon dashboard |
| **evidence_location** | Internal path to redacted screenshots |
| **verification_status** | PASS / FAIL / NOT VERIFIED / BLOCKED |
| **last_verified_timestamp** | UTC |

---

## Required env var **names** (values forbidden in repo)

Document that each environment **must** define (see also [`L35_SECRET_AND_CONFIG_OWNERSHIP_MATRIX.md`](./L35_SECRET_AND_CONFIG_OWNERSHIP_MATRIX.md)):

- `DATABASE_URL`, `REDIS_URL` (if used)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY` and/or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (where applicable)
- `RELOADLY_CLIENT_ID`, `RELOADLY_CLIENT_SECRET`, `RELOADLY_SANDBOX`
- `PRELAUNCH_LOCKDOWN`, `PAYMENTS_LOCKDOWN_MODE`, `NODE_ENV`
- `OPS_HEALTH_TOKEN` (when lockdown protects `/ready`)
- Email/OTP: `SMTP_*` or provider equivalents
- Frontend: `NEXT_PUBLIC_API_URL` (never localhost in production per README)

**Classification:** sensitive vs non-sensitive per matrix row.

**Rotation owner:** named role per secret class.

---

## Parity rules (preview/staging/prod)

- **Production** is the only env with **live** Stripe + live Reloadly — enforced by inventory + preflight.
- **Preview** must **not** inherit production `DATABASE_URL` without explicit exception record.

---

## References

- [`L35_PROVISIONING_RUNBOOK_DRY_RUN.md`](./L35_PROVISIONING_RUNBOOK_DRY_RUN.md), [`../SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md)
