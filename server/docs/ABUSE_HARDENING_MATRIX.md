# Phase 1 transaction path — abuse hardening matrix

| Route / surface | Risk | Mitigation | Residual risk |
|-----------------|------|------------|----------------|
| `POST` checkout create | Mass order creation, wallet stress | `checkoutAuthenticatedLimiter` (IP + user) | Shared IP NAT bucket skew |
| `POST` recharge execute | Polling / hammer fulfillment | `rechargeExecuteLimiter`, `authenticatedApiLimiter`, per-order gate | Compromised user token still bounded per window |
| `GET` order / list | Enumeration, scraping | `ordersReadLimiter` | Authenticated endpoints leak existence via 404 vs 403 if not unified |
| `GET` Phase 1 truth | Scraping detailed state | `phase1TruthReadLimiter` | Staff mirror uses separate auth |
| Stripe webhook | Flood / replay | `stripeWebhookLimiter`, signature verification, idempotent event table | Stolen signing secret bypasses (operational secret hygiene) |
| `/api/ops/*` staff | Data exfil, DOS | `requireAuth`, `requireStaff`, `staffPrivilegedLimiter` | Stolen staff JWT |
| Support full trace | PII / financial detail | `requireStaff` + staff limiter | Insider misuse |
| Auth | Credential stuffing | `authLimiter` | Distributed IPs |
| Public catalog | Scraping | `catalogLimiter` | Low business impact |

**Support truth:** non-staff callers must not receive staff canonical fields (`getCanonicalPhase1OrderForStaff` only on staff routes).
