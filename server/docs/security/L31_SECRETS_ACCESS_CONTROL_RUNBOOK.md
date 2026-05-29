# L31 — Secrets and access control runbook

**Purpose:** Operator discipline for credentials and privileged access. **Names only** — never values.

---

## Secrets inventory (environment variable names — typical)

| Class | Names (reference `SECRETS_MANAGEMENT.md`) |
|-------|---------------------------------------------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_PUBLISHABLE_KEY` |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| Database | `DATABASE_URL` |
| Redis | `REDIS_URL` |
| Email / OTP | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_*`, `OTP_TRANSPORT`, etc. |
| Reloadly | `RELOADLY_CLIENT_ID`, `RELOADLY_CLIENT_SECRET`, `RELOADLY_SANDBOX` |
| Admin / ops | `ADMIN_SECRET`, `ADMIN_SECRET_CURRENT`, `ADMIN_SECRET_PREVIOUS`, `OPS_HEALTH_TOKEN`, `OPS_INFRA_HEALTH_TOKEN` |
| Launch / lockdown | `PRELAUNCH_LOCKDOWN`, `PAYMENTS_LOCKDOWN_MODE`, `OWNER_ALLOWED_EMAIL`, `ZW_REQUIRE_OWNER_ALLOWED_EMAIL` |

---

## Rotation triggers

- **Scheduled:** JWT, admin secrets, SMTP — per security calendar.
- **Personnel:** Role change, contractor offboarding — revoke admin/ops tokens same day.
- **Incident:** Suspected leak, accidental paste, former employee had access — **emergency rotation**.
- **Vendor:** Stripe or Reloadly forces rotation; webhook endpoint migration.

---

## Emergency rotation process (outline)

1. **Contain:** Revoke old Stripe keys / webhook secret in Dashboard **after** new secret live on platform (overlap window per Stripe docs).
2. **Apply:** Update host env (Vercel/dashboard) — **no** values in git.
3. **Deploy / restart:** Rolling restart API + workers so all processes pick up env.
4. **Verify:** `preflight:production`, synthetic payment in **test** mode or controlled canary.
5. **Record:** Incident ticket with rotation timestamp and owners (no secret values).

---

## Operator access review

- **Quarterly:** List who has production dashboard, Stripe Dashboard, Reloadly, Neon.
- **Principle:** least privilege; separate read-only where possible.
- **Offboarding checklist:** remove GitHub org, Vercel team, Stripe user, email aliases.

---

## Vercel env handling rules

- Edit only via **authorized** project members; use **encrypted** env UI.
- No copying prod env to personal `.env` on laptops for routine work.
- **NO-GO:** pasting production secrets into CI logs, ChatGPT, or public gists.

---

## Stripe webhook secret handling

- Distinct from `STRIPE_SECRET_KEY`; rotate independently.
- After rotation, confirm Stripe Dashboard delivery success and app logs show no signature-invalid storm (except test probes).

---

## Reloadly credential handling

- Sandbox vs production clients must **not** be swapped; verify `RELOADLY_SANDBOX` on deploy.
- Secret rotation in Reloadly console → update `RELOADLY_CLIENT_SECRET` → restart.

---

## JWT secret handling

- Rotation forces re-login; plan comms for mobile/web sessions.
- Never reuse JWT material as `ADMIN_SECRET` or Stripe keys.

---

## Incident evidence rules

- Screenshots of env screens must **blur** values.
- Forensics exports: encrypted storage; retention per L29 policy.

---

## NO-GO

- **Never** print secret values in terminal copy-paste for chat assistants.
- **Never** open `server/.env.local` or production `.env` unless explicitly authorized for incident response — and then only on a secured workstation.
- **Never** commit secrets — `secrets:scan` must stay green.

---

## References

- [`../SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md)  
- [`L31_SECURITY_REVIEW_CHECKLIST.md`](./L31_SECURITY_REVIEW_CHECKLIST.md)
