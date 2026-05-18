# L33 — Load, stress, and chaos test plan

**Gate:** L33 = **non-production** validation of performance, saturation, and failure behavior.  
**Status:** Specification only — **no tests executed** in the creation of this package.

---

## L33 scope

| In scope | Out of scope |
|----------|----------------|
| Strategy, environments, safety, abort criteria | Executing load/stress/chaos against production |
| Alignment with existing scripts (`L20_LOAD_VERIFICATION.md`, `L19_CHAOS_VERIFICATION.md`) | Live Stripe charges, live Reloadly production |
| Evidence and handoff to L29/L36 | Changing rate limits or pool sizes without change control |

---

## Non-production-only policy

- **All** load, stress, capacity, and chaos drills run in **local**, **CI**, or **dedicated staging** with **synthetic** credentials unless a **signed waiver** exists for a bounded staging tenant.
- **Production** may receive only **normal** synthetic monitoring (e.g. low-frequency `/health`) defined in observability docs — **not** k6/Artillery saturation.

---

## Prohibited production test types

- Concurrent checkout/load against production URLs
- Webhook replay storms against production endpoint
- DB/Redis saturation from test harness against production
- Chaos injection (kill DB, drop Redis) against production
- Disabling `PRELAUNCH_LOCKDOWN` or signature verification for “easier” tests

---

## Test environments

| Tier | Use |
|------|-----|
| **Local** | Developer laptop + Docker Postgres/Redis; `AIRTIME_PROVIDER=mock`; synthetic Stripe (`sk_test_` / CI placeholders) |
| **CI** | Ephemeral DB; chaos integration suites per `L19_CHAOS_VERIFICATION.md` |
| **Staging** | Managed Postgres + Redis; Stripe test mode; Reloadly **sandbox** only for provider drills |

---

## Traffic model (synthetic)

- **Read-heavy:** `/health`, `/ready` (with `OPS_HEALTH_TOKEN` when lockdown requires), catalog, authenticated reads.
- **Write-light:** Auth/OTP (bounded), checkout create (test mode), wallet idempotency replays per `load:wallet:*` docs.
- **Webhook-shaped:** Only in integration/chaos harness with **valid signing secret for test env** — never blind replay.

---

## API endpoint classes

| Class | Examples | Notes |
|-------|----------|--------|
| **Public liveness** | `GET /health` | Highest safe concurrency for readiness sim |
| **Authenticated readiness** | `GET /ready` | Token required when `PRELAUNCH_LOCKDOWN=true` |
| **Money path** | Checkout, webhooks | **Test DB + mock/sandbox provider** |
| **Admin/support** | Recon read, DLQ list | Staff JWT; strict rate limits — low concurrency in load matrix |

---

## Money-path constraints

- Use `phase1:money-path-load` / integration chaos patterns: **mock airtime** default.
- No load test may **force** `sk_live_` or production webhook secret.

---

## Stripe constraints

- **Test mode** keys and Dashboard test webhooks for staging.
- Respect Stripe rate limits; backoff in harness.

---

## Provider constraints

- Reloadly: **sandbox** credentials and `RELOADLY_SANDBOX=true` for stress; follow `RELOADLY_SANDBOX_GOLDEN_PATH.md` bounds.

---

## Test data rules

- Disposable users/orders; no production PII imports.
- After drill: truncate or refresh staging DB per policy — **no** prod data copies with real emails/phones without redaction approval.

---

## Ramp-up / ramp-down

- **Ramp-up:** 0 → 25% → 50% → 100% of **planned** RPS over ≥5 min steps; hold peak ≥10 min only if healthy.
- **Ramp-down:** Step down before stopping to observe queue drain.

---

## Safety guardrails

- Hard **RPS ceiling** per environment (document in execution record).
- **Kill switch:** operator can abort script; prefer staging VPN/IP allowlist.
- **Freeze** production deploys during active staging saturation unless coordinated.

---

## Abort criteria

- Error rate > agreed threshold (see [`L33_METRICS_THRESHOLDS_AND_EVIDENCE.md`](./L33_METRICS_THRESHOLDS_AND_EVIDENCE.md))
- p95 latency > 2× baseline for **read** path
- DB connection errors, Redis timeouts, or webhook ACK SLO breach in staging
- Any unexpected **money-path** duplicate or ledger anomaly

---

## Dependencies on L26–L32

| Gate | L33 dependency |
|------|----------------|
| **L26** | Timeout/`/ready` semantics — verify in staging before trusting numbers |
| **L27** | Webhook ACK behavior — chaos suite + PR #5 eventual merge |
| **L28** | Provider sandbox ceilings |
| **L29** | Metrics/logs for drill observation |
| **L30** | Support comms if staging shared with testers |
| **L31** | Fraud/rate-limit posture under load |
| **L32** | Soft-launch guardrails define **production** traffic cap — L33 proves **staging** capacity first |

---

## NO-GO conditions

- Running documented harness against **production** hostname.
- Live money, live Reloadly prod, or real customer accounts in load script.
- Missing DB snapshot/backup for destructive staging tests.
- No on-call owner during **large** staging saturation.

---

## References

- [`L33_LOAD_TEST_MATRIX.md`](./L33_LOAD_TEST_MATRIX.md), [`L33_STRESS_AND_CAPACITY_PLAN.md`](./L33_STRESS_AND_CAPACITY_PLAN.md), [`../runbooks/L33_CHAOS_FAILURE_DRILL_RUNBOOK.md`](../runbooks/L33_CHAOS_FAILURE_DRILL_RUNBOOK.md)
- [`../L19_CHAOS_VERIFICATION.md`](../L19_CHAOS_VERIFICATION.md), [`../L20_LOAD_VERIFICATION.md`](../L20_LOAD_VERIFICATION.md)
