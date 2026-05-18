# L33 — Load test matrix

**All rows:** non-production unless **explicitly** labeled and approved. Status columns filled at execution time.

Columns: **Surface** | **Test type** | **Environment** | **Traffic pattern** | **Expected threshold** | **Metrics** | **Owner** | **Safety** | **Launch-blocking if FAIL**

---

## Matrix

| Surface | Test type | Environment | Traffic pattern | Expected threshold | Metrics to capture | Owner | Safety constraints | Launch-blocking if FAIL |
|---------|-----------|-------------|-----------------|-------------------|-------------------|-------|-------------------|-------------------------|
| `GET /health` | Load | Staging/local | 100–500 concurrent GET, ramp | <1% errors, p95 < 500ms (env baseline) | HTTP code, latency hist | SRE | No prod URL | Y if cannot sustain minimal liveness |
| `GET /ready` | Load | Staging | Burst ≤50 concurrent with valid `OPS_HEALTH_TOKEN` | 200 or expected 503 semantics documented | `readinessReason` rate | SRE | Token from vault; never log token | Y if auth probe flaky |
| Auth / login / OTP | Stress | Staging | Step to auth limiter boundary | 429 at threshold, no 5xx storm | 401/429/5xx ratio | Eng | **No** credential stuffing dataset | Y if limiters ineffective |
| Checkout / payment initiation | Load | Local/staging + test Stripe | Low concurrent sessions (tens) | Success rate ≥ baseline − 5% | PI create latency | Eng | `sk_test_` only; mock/sandbox provider | Y |
| `POST /webhooks/stripe` (signed) | Integration load | CI/local only | Harness from `stripeWebhookHttpChaos` patterns | No duplicate ledger mutation | Chaos log markers | Eng | Synthetic `whsec_`; **never** prod endpoint | Y |
| Refund/dispute simulation | Functional | CI/staging Dashboard | Manual or test API | N/A — no load | Stripe test objects | Finance+Eng | Test mode only | N |
| Reloadly sandbox flow | Load | Staging | Bounded parallel top-ups | Provider error rate < policy | Circuit state, latency | L28 owner | Sandbox creds only | Y if prod-like path untested |
| Reconciliation scans | Batch | Staging | Chunked admin/cron | Completes < SLA window | Duration, rows scanned | Eng | Read-heavy; throttle | N unless timeout production |
| Admin recon read APIs | Load | Staging | Low RPS (≤10) with admin JWT | p95 < 2s | 401/403/429 | Eng | Staff limiter | N |
| Rate-limit / abuse boundary | Stress | Staging | Approach `ABUSE_HARDENING_MATRIX` limits | Stable 429, not crash | Block vs pass | Security | Stop before IP ban collateral | Y if money route unbounded |

---

## Notes

- **Webhook:** Production load of unsigned or replayed events is **out of scope** — use Stripe CLI or integration tests.
- **“Launch-blocking”** means: do not widen soft launch cohort until remediated or waived in writing.

---

## References

- [`../ABUSE_HARDENING_MATRIX.md`](../ABUSE_HARDENING_MATRIX.md), [`L33_LOAD_STRESS_CHAOS_TEST_PLAN.md`](./L33_LOAD_STRESS_CHAOS_TEST_PLAN.md)
