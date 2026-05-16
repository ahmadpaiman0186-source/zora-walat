# Zora-Walat — limited beta readiness gate — 2026-05-15

## 1. Executive summary

Staging API **liveness and readiness** are healthy, Stripe **test-mode webhooks** have been verified **2xx** in prior work, and **targeted** money-path / webhook / checkout URL **unit anchors pass**. However, **automated alerting is not wired**, the **full local `npm test` suite does not pass cleanly** on the audited workstation (26 failing tests in the latest full run), and **operational mistakes** (live Stripe keys, wrong deploy root, post-rollback env drift) remain the dominant real-world hazards. This document is a **limited beta gate**, not public-launch sign-off.

**Staging alias:** `https://zora-walat-api-staging.vercel.app`  
**Deploy root (mandatory):** `C:\Users\ahmad\zora_walat\server`

---

## 2. Current readiness scorecard

| Area | Status | Evidence |
|------|--------|----------|
| HTTP liveness | Green | `/api/index`, `/api/health`, `/ready` return **200** |
| Stripe webhook transport | Green (staging) | Prior verification: **2xx** on `checkout.session.completed` and `payment_intent.succeeded` |
| Money-path audits (targeted tests) | Green | `orderStateSafetyAudit`, `fulfillmentFailureSafetyAudit`, `slimStripeWebhookEntrypoint`, `checkoutRedirectUrls` — **all pass** when run together |
| Full unit suite (`npm test`) | **Red** | Latest run: **841 pass, 26 fail**, exit code **1** (~109s) |
| Alerting / SLO automation | **Red** | Not wired to paging or error budget burn |
| Live key / prod Stripe guardrails | **Yellow** | Policy + code exist; **human process** must enforce test keys for beta |
| Integration / DB tests | **Yellow** | `npm run test:integration` not re-run in this gate; requires `TEST_DATABASE_URL` / CI |

---

## 3. Green checks

- Staging **curl** probes for `/api/index`, `/api/health`, `/ready` succeed within **20s**.
- **Slim Stripe webhook** path: signature gate, unmatched fixture fast-ack, replay handoff covered by **`slimStripeWebhookEntrypoint.test.js`**.
- **Order / fulfillment invariants** covered by **`orderStateSafetyAudit.test.js`** and **`fulfillmentFailureSafetyAudit.test.js`** (no DB).
- **Checkout return URL / redirect diagnostics** covered by **`checkoutRedirectUrls.test.js`**.
- **Deploy hygiene:** `server/.vercelignore` excludes `.env` files from Vercel upload.
- **Rollback / ops narrative** documented in `docs/ops/zora-walat-logs-rollback-runbook-2026-05-15.md` (includes **§13 safe test commands**).

---

## 4. Red blockers

1. **`npm test` not green** locally: **26** failing tests in full suite (same run that completed in ~**111s**). Until CI or local suite is green, this is a **hard gate** for claiming “all unit tests pass.”
2. **No automated alerting** on Vercel 5xx spikes, webhook failure rate, DB connectivity, or fulfillment backlog — operators rely on dashboards and manual checks.
3. **No single “beta launch” integration proof** in this document: **authenticated real checkout** end-to-end must still be executed and recorded.

---

## 5. Yellow risks

| Risk | Mitigation (process) |
|------|----------------------|
| **Accidental live Stripe key** in staging | Use Dashboard key mode labels; `isStripeKeyAllowedForWebTopupCharges`-style gates in code; **never** paste `sk_live_` into staging env |
| **Deploy from monorepo root** | Enforce `cd server` + `vercel deploy`; checklist item below |
| **Env drift after rollback** | Re-verify **all** Vercel env vars and Stripe webhook URL after `vercel rollback` / `vercel promote` |
| **Observability without paging** | Assign on-call rotation; watch Vercel + Stripe delivery dashboards during beta |

---

## 6. Required real checkout test plan

1. **Staging only**, Stripe **test mode**, small denomination.
2. **Authenticated** user completes **hosted checkout** created by the real API (not CLI-only fixtures).
3. Confirm in order: **checkout row** → **Stripe session** → **webhook 2xx** → **`PaymentCheckout` PAID + `PAYMENT_SUCCEEDED`** → **fulfillment queued/processing** (or explicit sandbox mock path).
4. Record **Stripe event id suffix** and internal **order id suffix** in the ticket (not secrets).
5. Repeat once after any **deploy or rollback** that touches money-path code.

---

## 7. Beta go / no-go checklist

- [ ] Staging `/api/index`, `/api/health`, `/ready` all **200**
- [ ] Stripe Dashboard: latest webhook deliveries **2xx** for required event types
- [ ] `server/.vercelignore` contains `.env` entries
- [ ] Vercel env: **test** Stripe keys only; webhook secret matches Dashboard endpoint
- [ ] **Real checkout** test (§6) executed and ticketed
- [ ] **CI or local `npm test` green** (currently **not** met on audited machine)
- [ ] Rollback drill: operators know `vercel inspect` / `vercel rollback` / post-rollback curls (see logs runbook §9–10)
- [ ] Support channel defined for beta users (§8)

**If any Red blocker remains unresolved → default to NO-GO or CONDITIONAL GO with written waivers.**

---

## 8. Support and incident process

1. **Triage:** Vercel logs → Stripe event delivery → internal order id (suffix only in chat).
2. **Severity:** payment mismatch / double charge suspicion = **highest**; pure 4xx on bad client input = lower.
3. **Communication:** No secret or full card data in Slack/email; use ticket internal fields.
4. **Escalation:** If money-path invariant suspected broken → freeze risky flags (e.g. fulfillment dispatch), **rollback** deployment first per runbook, then root-cause in a branch.
5. **Post-incident:** Update ops docs with timestamp, deployment id, and corrective action.

---

## 9. Rollback process

Use **`docs/ops/zora-walat-logs-rollback-runbook-2026-05-15.md`** §9–10: `vercel inspect`, `vercel rollback` / `vercel promote`, then **curl** probes and **Stripe test webhook**. After rollback, explicitly **re-check env vars** (addresses **env drift**).

---

## 10. Monitoring checklist (manual beta period)

- [ ] Vercel: error rate and **function duration** for `/webhooks/stripe`
- [ ] Stripe: webhook **delivery success %** and response times
- [ ] Database: connection errors (Prisma **P1001** / **P1002**) in logs — no connection string in tickets
- [ ] Fulfillment: stuck **PAID** without attempt progression (reconciliation scripts / categories in docs)
- [ ] Duplicate fulfillment metrics: fortress / `emitPhase1DuplicateFulfillmentBlocked` spikes

---

## 11. Beta scope limits

- **Not** general-public marketing launch.
- **Not** production **live** card network without separate PCI/compliance and live-key program.
- **Staging-first**; feature flags and user allowlists recommended.
- **Webhooks** must remain **test mode** keys unless a separate audited live program exists.

---

## 12. Final recommendation

**CONDITIONAL GO** for a **small, allowlisted** limited beta **only if**:

1. Owners accept **manual monitoring** until alerting exists, and  
2. **§6 real checkout** is executed successfully on staging **after** the current deployment, and  
3. **CI** (or a clean local) achieves **`npm test` exit 0** — **or** the 26 failures are triaged to **known-flake / env-specific** with written sign-off.

Otherwise: **NO-GO** until the **full unit suite** and **alerting minimum** (e.g. Vercel + Stripe email alerts) are addressed.

---

## Appendix — safe test commands

See **`docs/ops/zora-walat-logs-rollback-runbook-2026-05-15.md` §13**. Summary:

- `npm run lint` / `typecheck` / `build`: **missing** in `server/package.json`.
- `npm test`: run **without** truncating stdout on PowerShell.
- Targeted:  
  `node --import ./test/setupTestEnv.mjs --test test/orderStateSafetyAudit.test.js test/fulfillmentFailureSafetyAudit.test.js test/slimStripeWebhookEntrypoint.test.js test/checkoutRedirectUrls.test.js`
