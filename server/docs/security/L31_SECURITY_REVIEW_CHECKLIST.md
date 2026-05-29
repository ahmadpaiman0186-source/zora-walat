# L31 — Security review checklist (pre-launch / periodic)

**Use:** Engineering + security champion sign-off before soft launch and quarterly thereafter.  
**Not a substitute** for L38 pen test or legal/compliance sign-off.

---

## Authentication / JWT / session

- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are **distinct**, strong, platform-injected in production.
- [ ] Token lifetime and refresh behavior reviewed; no long-lived tokens in query strings.
- [ ] Staff vs user auth paths cannot be confused (`requireStaff` on privileged routes).
- [ ] Session invalidation plan documented for JWT rotation.

## OTP / email

- [ ] OTP transport and rate limits reviewed; brute-force window acceptable.
- [ ] SMTP credentials in vault only; not in repo.
- [ ] Email enumeration risk acknowledged (404 vs 403 policy) where applicable.

## CORS / prelaunch lockdown

- [ ] `PRELAUNCH_CORS_ALLOWLIST` matches intended web origins (`corsPolicy.js`).
- [ ] `PRELAUNCH_LOCKDOWN` explicitly `true` or `false` for Stripe live preflight (`stripeLiveReadinessPreflight.js`).
- [ ] `PAYMENTS_LOCKDOWN_MODE` behavior understood for freeze scenarios (`DEPLOYMENT_READINESS.md`).

## Stripe webhook signature

- [ ] `STRIPE_WEBHOOK_SECRET` matches Dashboard endpoint; rotation procedure known.
- [ ] Invalid signature events monitored (security log / L29 queries).
- [ ] Operators trained: HTTP 200 ≠ full success for all webhook outcomes (L27/L29 caveat).

## Provider / Reloadly controls

- [ ] `RELOADLY_SANDBOX` matches environment intent; no sandbox creds on live money path.
- [ ] OAuth client secret rotation path documented.
- [ ] Production rehearsal checklist completed when L28 verified (`RELOADLY_PRODUCTION_REHEARSAL.md`).

## Secrets / env

- [ ] `npm --prefix server run secrets:scan` clean on release branch.
- [ ] No `.env.local` with real material committed; `.gitignore` rules confirmed.
- [ ] Admin / ops tokens (`ADMIN_SECRET*`, `OPS_HEALTH_TOKEN`) rotated on schedule or after incident.

## Rate limits / abuse

- [ ] `ABUSE_HARDENING_MATRIX.md` matches deployed routes (checkout, recharge, webhooks, staff).
- [ ] Stripe webhook limiter appropriate for peak Stripe retry traffic.

## Fraud scoring / risk events

- [ ] Velocity / fraud keys and Redis dependency understood.
- [ ] User-facing messages remain opaque (no internal fraud labels leaked).
- [ ] Referral fraud signals logged; review path exists.

## Ledger / audit immutability

- [ ] No process proposes `UPDATE`/`DELETE` on journal tables in prod (`BACKUP_RESTORE_DRILL.md`).
- [ ] Admin audit actions traceable (`OrderAudit` / audit logs per product).

## Refunds / disputes

- [ ] Phase 1 manual Stripe workflow understood (`PHASE1_REFUND_AND_DISPUTE.md`).
- [ ] No automated refund without future product + compliance review.

## Support / admin / manual recovery

- [ ] L30 authority matrix aligned: who may refund, replay, DLQ retry.
- [ ] Staff “full trace” access logged and need-to-know.

## Logging / redaction

- [ ] HTTP redact paths and Phase 1 observability sanitization reviewed.
- [ ] No Stripe raw bodies or PAN in log drains.

## Backup / restore handoff

- [ ] L25 drill status known; restore does not imply ledger `UPDATE` shortcuts.

## Monitoring / alerts handoff

- [ ] L29 alert routing ADR reviewed; money-path alerts not silenced without process.

## Incident response handoff

- [ ] L31 fraud runbook linked in on-call resources.
- [ ] L30 customer templates used for external comms.

## Release approval handoff

- [ ] CI green; `preflight:production` when applicable.
- [ ] Change record: deploy id, rollback owner, incident channel.

---

**Sign-off (template)**

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Security champion | | |
