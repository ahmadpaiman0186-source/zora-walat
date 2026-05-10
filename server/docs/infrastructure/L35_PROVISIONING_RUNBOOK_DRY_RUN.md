# L35 — Provisioning runbook (dry-run only)

**This is a checklist for humans.** **Do not perform** provisioning during doc review without **separate** change approval. **No secret values** below.

---

## Prerequisites

- [ ] Org: Vercel team access, Neon org, Stripe account, Reloadly account, DNS registrar
- [ ] Inventory row created ([`L35_ENVIRONMENT_INVENTORY_SCHEMA.md`](./L35_ENVIRONMENT_INVENTORY_SCHEMA.md))
- [ ] Two-person rule for production money-path env

---

## Access model

- **Break-glass:** named holders only; all dashboard actions under named tickets.

---

## Vercel — project creation / linking (checklist)

- [ ] Frontend: link repo root → project name per internal standard (see root `README.md`)
- [ ] API: link `server/` → **separate** project
- [ ] Set **production** branch and **root directory** correctly
- [ ] **Forbidden:** pasting secrets into build logs or repo

---

## Neon / Postgres (checklist)

- [ ] Create project/branch for env
- [ ] Record **project id** (not password) in inventory
- [ ] Run `prisma migrate deploy` from approved pipeline
- [ ] Connection: pooler URL if required by serverless

---

## Redis / queue (checklist)

- [ ] Provision instance; TLS if required
- [ ] Set `REDIS_URL` name in Vercel only
- [ ] Verify BullMQ connectivity from worker path

---

## Stripe (checklist)

- [ ] **Test** vs **live** mode explicit
- [ ] Create webhook endpoint → API HTTPS URL
- [ ] Record signing secret in Vercel **without** echoing in chat

---

## Reloadly (checklist)

- [ ] Sandbox app for non-prod
- [ ] Production app isolated
- [ ] `RELOADLY_SANDBOX` matches intent

---

## DNS / domain (checklist)

- [ ] Apex → Vercel
- [ ] API subdomain → API project
- [ ] TLS auto-renewal verified

---

## Observability / log drain (checklist)

- [ ] When L29 approved: create drain **via** vendor UI; env name only in Vercel

---

## GitHub Actions (checklist)

- [ ] Repository **secrets** for CI: synthetic only per `CI_VERIFICATION.md`
- [ ] **Never** copy production secrets into `workflow` YAML

---

## Migrations and readiness

- [ ] `npm run preflight:production` (or staging equivalent) after env bind
- [ ] `GET /health` then authenticated `GET /ready` if lockdown

---

## Rollback / rebuild

- Redeploy previous Vercel deployment; **do not** rewind ledger via SQL

---

## Evidence required

- Inventory row **PASS**; redacted screenshots; deploy ids

---

## Forbidden without approval

- Creating **second** production database without L25 alignment
- Wide-open CORS
- Sharing `DATABASE_URL` in Slack

---

## Operator signoff

| Role | Name | Date |
|------|------|------|
| Eng | | |
| Infra | | |

---

## References

- [`L35_RECREATE_ENVIRONMENT_FROM_SCRATCH_RUNBOOK.md`](../runbooks/L35_RECREATE_ENVIRONMENT_FROM_SCRATCH_RUNBOOK.md)
