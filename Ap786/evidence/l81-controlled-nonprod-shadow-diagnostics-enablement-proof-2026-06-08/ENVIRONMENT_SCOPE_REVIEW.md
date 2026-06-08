# L-81 — Environment scope review

## In scope (L-81)

- Read-only review of flag, webhook boundary, and safe trigger paths
- Local unit/CLI regression (no network, no DB)
- Evidence filing under Ap786

## Out of scope (not authorized by L-81 approval)

- Production runtime or Vercel env mutation
- Staging env var `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED=true` without explicit env/deploy approval
- Stripe webhook replay/resend
- Payment/checkout creation
- Provider/Reloadly API calls
- Real DB reads/writes for observability capture
- Live enforcement or fulfillment behavior change

## Staging vs local

| Path | Classification |
|------|----------------|
| Unit tests with `envConfig` override | Local/code-only — proves hook + envelope |
| `npm run shadow-safety-gate` CLI | Local L-78 harness — **does not** emit L-80 sanitized webhook envelope |
| Deployed staging webhook route + logs | **Not executed** — requires env + inbound webhook |

---

*End.*
