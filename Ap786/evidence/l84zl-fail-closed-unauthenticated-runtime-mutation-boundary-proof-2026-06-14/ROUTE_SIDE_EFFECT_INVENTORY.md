# L-84ZL — Route side-effect inventory (tracked code)

**Deployment context:** Staging root build `./` — active bridges: `api/health-ready.mjs`, `api/webhooks/stripe.mjs`. `server/api/index.mjs` **not** root-exposed.

**Verdict:** `CORE10-L84ZL-VERDICT-002: FAIL_CLOSED_UNAUTHENTICATED_RUNTIME_MUTATION_BOUNDARY_PROOF_PARTIAL_UNPROBED_WEBHOOK_AUDIT_WRITE_RISK_REMAINS_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

| Route | Method | Handler | Side-effect class | Auth/signature/body validation before money/service/provider side effect? | Classification | Safe to probe? | L-84ZL action |
|-------|--------|---------|-------------------|------------------------------------------------------------------------|----------------|----------------|---------------|
| `/api/webhooks/stripe` | POST | `api/webhooks/stripe.mjs` → `slimStripeWebhookHandler.mjs` | Money-path after valid Stripe signature; **non-money audit** via `recordStripeWebhookAudit` at entry/rejection | **YES** for payment — **400** before event processing; **audit may write before/without signature success** | **BLOCKED_UNSAFE_TO_PROBE_DUE_NON_MONEY_AUDIT_WRITE_RISK** | **NO** | **Not probed (W1)** |
| `/webhooks/stripe` | POST | Rewrite → same | Same | Same | **BLOCKED_UNSAFE_TO_PROBE_DUE_NON_MONEY_AUDIT_WRITE_RISK** | **NO** | **Not probed (W2)** |
| `/api/health-ready?route=health` | POST | `api/health-ready.mjs` | **None** | **YES** — `methodNotAllowed` **405** before imports | **SAFE_NEGATIVE_PROBE** | **YES** | **Probed H1 — PASS** |
| `/api/health-ready?route=ready` | POST | `api/health-ready.mjs` | **None** | **YES** — GET-only ready → **405** | **SAFE_NEGATIVE_PROBE** | **YES** | **Probed H2 — PASS** |
| `/api/health` | POST | Rewrite → health bridge | **None** | **YES** | **SAFE_NEGATIVE_PROBE** | **YES** | **Probed H3 — PASS** |
| `/api/ready` | POST | Rewrite → ready bridge | **None** | **YES** | **SAFE_NEGATIVE_PROBE** | **YES** | **Probed H4 — PASS** |
| `/health` | POST | Rewrite → health bridge | **None** | **YES** | **SAFE_NEGATIVE_PROBE** | **YES** | **Probed H5 — PASS** |
| `/ready` | POST | Rewrite → ready bridge | **None** | **YES** | **SAFE_NEGATIVE_PROBE** | **YES** | **Probed H6 — PASS** |
| `/api/create-checkout-session` | POST | `slimCreateCheckoutHandler.mjs` (server deploy) | Checkout / Stripe session | Bearer **401** before checkout in code | **NOT_EXPOSED** on root staging | **NO** | Not probed |
| `/api/checkout` | POST | No tracked handler | Unknown | Not proven | **NOT_EXPOSED** | **NO** | Not probed |
| `/api/auth/login` | POST | `slimAuthLoginHandler.mjs` (server deploy) | Auth token / DB on valid creds | Zod before `loginUser`; **not root-exposed** | **NOT_EXPOSED** | **NO** | Not probed |
| `/api/auth/register`, OTP routes | POST | Slim auth handlers | User/OTP side effects | Not root-exposed | **NOT_EXPOSED** | **NO** | Not probed |
| `/api/ops/staging-*` POST | POST | Ops handlers | Possible DB/email mutation | **UNSAFE_OR_UNCLEAR** without guard proof | **NOT_EXPOSED** | **NO** | Not probed |

## Code references

- Health POST gate: `api/health-ready.mjs` — `methodNotAllowed`, no POST to health/ready handlers
- Webhook audit: `slimStripeWebhookHandler.mjs` L206–211, L277 — `recordStripeWebhookAudit` on entry and missing-signature **400**
- Root rewrites: `vercel.json` — health/ready → `/api/health-ready?route=…`

---

*End.*
