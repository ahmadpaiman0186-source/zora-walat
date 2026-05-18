# Day 1 → L-3 … L-7 — Suggested checklist (not executed)

High-level themes to schedule after L-1/L-2 closure. Titles are **suggested**; align with your internal L taxonomy.

## L-3 — CI / quality gates

- [ ] Default-branch PR with green CI for the slim webhook + return + operator changes.  
- [ ] Required reviewers for money-path diffs.  
- [ ] Security scan / dependency audit on release candidate.

## L-4 — Staging hardening matrix

- [ ] Repeat payment smoke with **fresh** session id; confirm PAID within agreed SLA.  
- [ ] Webhook **replay** test (Dashboard resend) — order stays terminal, attempt count stable.  
- [ ] Load spot-check on `/ready` and `/health` under burst (bounded).

## L-5 — Production environment parity

- [ ] Env inventory: names only in docs; values in secret manager only.  
- [ ] Stripe **live** vs **test** policy documented; kill switches (`PRELAUNCH_LOCKDOWN`, etc.) reviewed.  
- [ ] CORS and `CLIENT_URL` / return URL origins verified for production web app.

## L-6 — Observability and alerting

- [ ] Dashboards: webhook success/failure, checkout funnel, fulfillment backlog.  
- [ ] Paging runbook for webhook 5xx or DB transaction failures.  
- [ ] Log redaction audit (no secrets in structured logs).

## L-7 — Go-live rehearsal

- [ ] Dark launch or canary plan.  
- [ ] Rollback: redeploy prior SHA + feature flags.  
- [ ] Post-launch monitoring window and owner on-call.

**Note:** Renumber if your program already assigned L-3–L-7 to different themes; keep the **substance**, not the label.
