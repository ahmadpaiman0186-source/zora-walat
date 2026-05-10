# L35 — Secret and config ownership matrix

**Names only.** **Never** commit values. Storage type examples: Vercel encrypted env, Neon console, GitHub Actions **secrets**, vault.

| Config name | Sensitivity | Owner | Env scope | Rotation trigger | Storage location type | Validation / evidence | Rollback behavior | NO-GO if missing/misconfigured |
|-------------|-------------|-------|-----------|------------------|------------------------|----------------------|-----------------|--------------------------------|
| `DATABASE_URL` | Critical | Eng + DBA | All non-local | Password rotate, leak | Vercel env / Neon inject | `prisma migrate status`, connect smoke | Prior password + redeploy | **Y** — app cannot start safely |
| `DIRECT_URL` / pooler variants | Critical | DBA | If used | Same as DB | Vercel env | Migrations / long queries | Revert URL | Y if pooler wrong |
| `JWT_ACCESS_SECRET` | Critical | Eng | API | Schedule / leak | Vercel env | Auth e2e | Dual-secret rotation plan | Y |
| `JWT_REFRESH_SECRET` | Critical | Eng | API | Schedule / leak | Vercel env | Refresh flow test | Same | Y |
| `STRIPE_SECRET_KEY` | Critical | Finance+Eng | API | Stripe rotation | Vercel env | `preflight:production`, Dashboard | Prior key window | **Y** — money path |
| `STRIPE_WEBHOOK_SECRET` | Critical | Eng | API | Endpoint change | Vercel env | Signed test event | Overlap with old secret | **Y** |
| `STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | High | Eng | API / web | Stripe Dashboard | Vercel env | Client load test | Revert key | Y if mode mismatch |
| `RELOADLY_CLIENT_ID` | High | L28 owner | API | Reloadly console | Vercel env | Sandbox ping | Revert | Y if prod top-up |
| `RELOADLY_CLIENT_SECRET` | Critical | L28 owner | API | Rotation | Vercel env | OAuth token | Overlap | Y |
| `RELOADLY_SANDBOX` | High | Eng | API | Never wrong in prod | Vercel env | Startup validation | Set `true`/`false` correctly | **Y** if sandbox creds on live |
| `PRELAUNCH_LOCKDOWN` | High | Eng+Product | API | Launch phase | Vercel env | `/ready` / CORS behavior | Toggle documented | Y if accidental live exposure |
| `PAYMENTS_LOCKDOWN_MODE` | High | Eng | API | Incident | Vercel env | Checkout 503 | Toggle off | Y during unplanned freeze |
| CORS / client URL (`CLIENT_URL`, allowlist-related) | High | Eng | API | Domain change | Vercel env | Browser smoke | Revert domain | Y if open CORS in prod |
| `OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` | Critical | SRE | API | Quarterly / leak | Vercel env | Authenticated `/ready` | Rotate + update synthetics | Y if missing under lockdown |
| `REDIS_URL` | Critical | Eng | API (if queues) | Password rotate | Vercel env | Queue depth, limiters | Prior URL | Y if queue money-path |
| Queue flags (`FULFILLMENT_QUEUE_ENABLED`, etc.) | High | Eng | API | Architecture | Vercel env | Producer health | Revert flag | Y if inconsistent |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_*`, `OTP_TRANSPORT` | High | Eng | API | SMTP compromise | Vercel env | OTP test mail | Revoke app password | Y if OTP down at launch |
| Fraud / rate-limit / security toggles | High | Security+Eng | API | Policy | Vercel env | Abuse matrix review | Revert | Y if disabled in prod |
| Observability / log drain tokens (future) | High | SRE | API | Vendor rotate | Vercel env | Log delivery test | Prior token | N until wired |

---

## References

- [`../SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md), [`L35_ENVIRONMENT_INVENTORY_SCHEMA.md`](./L35_ENVIRONMENT_INVENTORY_SCHEMA.md)
