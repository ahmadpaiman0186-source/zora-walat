# L37 — Vendor risk register

Rolling register of **vendor-related** risks for Phase 1 fulfillment. Update status during quarterly reviews or after incidents. **No secret values** in this file.

| Vendor dependency | Failure mode | Likelihood | Impact | Detection | Mitigation | Fallback | Owner | Evidence | Status |
|-------------------|-------------|------------|--------|-----------|------------|----------|-------|----------|--------|
| **Reloadly API** | Regional outage / degraded API | M | H | Error rates, vendor status, circuit open | Circuit breaker, backoff, capacity limits | Pause ingress; **no** prod mock chain | Eng SRE | Status page captures, metrics slice | NOT VERIFIED |
| **Reloadly auth** | Expired/revoked credentials | L | H | Auth errors, startup validation | Secret rotation, monitoring on 401/403 | Halt outbound; fix secrets | Platform | Ticket + rotation log (redacted) | NOT VERIFIED |
| **Reloadly quotas** | Rate limit / account cap | M | M | 429, vendor comms | Throttle, queue shaping | Vendor limit increase | AM + SRE | Quota correspondence | NOT VERIFIED |
| **Operator catalog drift** | Wrong operator id / SKU mismatch | L | H | Wrong denomination, elevated disputes | Strict mapping, preflight scripts | SKU freeze | Product + Eng | Mapping audit artifact | NOT VERIFIED |
| **Stripe (payment)** | Webhook delay / signing issues | M | H | Fulfillment not started | Webhook monitoring, idempotency | Replay / fix endpoint | Eng | Stripe dashboard delivery logs | NOT VERIFIED |
| **Stripe disputes** | Chargeback while fulfillment in flight | M | H | Double compensation risk | Linked refund policy | Coordinate finance + eng | Finance | Case ids (redacted) | NOT VERIFIED |
| **Redis / BullMQ** (if enabled) | Queue stall, poison message | M | M | DLQ growth, lag | Worker alerts, DLQ runbook | Pause worker, isolate job | Eng | Queue depth graphs | NOT VERIFIED |
| **Neon / PostgreSQL** | DB unavailable | L | H | All paths fail | Provider status, app health | Failover per infra docs | Platform | Infra incident record | NOT VERIFIED |
| **Vercel / hosting** | Cold start / regional issue | M | M | Latency, 5xx | Platform status | Scale / reroute per runbook | Platform | Status capture | NOT VERIFIED |

**Likelihood:** L = low, M = medium, H = high (qualitative).  
**Impact:** H = severe customer/financial/regulatory exposure.

## Review cadence

- **Quarterly:** confirm owners, refresh SLA evidence pointers.
- **Post-incident:** add rows or update status within 5 business days.

## Related

- [L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md](./L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md)
- [L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md](./L37_PROVIDER_SLA_EVIDENCE_REQUIREMENTS.md)
- [L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md](./L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md)
