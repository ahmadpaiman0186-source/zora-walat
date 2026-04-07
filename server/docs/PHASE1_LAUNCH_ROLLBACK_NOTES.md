# Phase 1 — launch and rollback (engineering)

Operational checklist only; not a substitute for your hosting provider’s runbooks.

## Pre-deploy (same train as CI)

- `npm run test:ci` (or CI green) including integration + HTTP webhook chaos on a migrated DB.
- `npm run phase1:launch-readiness -- --strict` where applicable.
- `DATABASE_URL` targets the intended database; `npx prisma migrate deploy` applied.
- Stripe live/test mode keys and webhook endpoint match the environment.
- Redis / rate limits / `PRELAUNCH_LOCKDOWN` reviewed for the target environment.

## Rollback (application)

- **Preferred:** redeploy previous **container/image or git revision** known good; do not patch production schema backward without a migration plan.
- **Money path:** do not delete `StripeWebhookEvent` rows or edit settled checkout rows manually except via approved support procedures.
- **Feature flag:** tightening `PRELAUNCH_LOCKDOWN=true` blocks new checkouts while leaving read paths up — use when you need a fast “stop the bleeding” without a full deploy.

## Post-incident

- Use `docs/PHASE1_INCIDENT_PLAYBOOK.md`, `GET /api/admin/ops/phase1-report`, `GET /api/orders/:id/phase1-truth` (owner), and structured `phase1Ops` logs.
- Re-run reconciliation scripts if your ops process requires it (`scripts/reconciliation-scan.mjs`).

## Honesty note

Rollback **credibility** depends on DB backups, deploy automation, and measured RTO/RPO — not on this document alone.
