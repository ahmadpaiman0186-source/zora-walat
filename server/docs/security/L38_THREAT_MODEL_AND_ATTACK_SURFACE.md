# L38 — Threat model and attack surface

**Status:** Documentation for planning and review. Not a certification of penetration test results.

## Assets

| Asset | Value / impact if compromised |
|-------|-------------------------------|
| **Customer accounts** | Identity, order history, PII |
| **JWT / session tokens** | Account takeover, unauthorized API use |
| **Stripe keys & webhook secret** | Fraudulent charges, webhook spoofing |
| **Database (orders, ledger-adjacent rows)** | Financial mis-reporting, privacy breach |
| **Admin / reconciliation endpoints** | Mass data exposure, operational abuse |
| **Provider credentials (Reloadly)** | Unauthorized fulfillment spend |
| **Logs / metrics** | PII leakage, attacker reconnaissance |
| **Build & deploy pipeline** | Supply-chain compromise |

## Trust boundaries

```text
[ Internet / Client ]
        |
        v
[ API Gateway / Edge --- TLS termination, rate limits ]
        |
        v
[ Application --- authZ, business logic ]
        |
        +--> [ Stripe ]   (payment + webhooks)
        +--> [ Provider ] (fulfillment)
        +--> [ PostgreSQL ]
        +--> [ Redis ]    (optional queue/metrics)
```

- **Trust** Stripe webhook payloads **only** after signature verification and idempotent processing.
- **Do not** trust client-supplied amounts, product identifiers, or “paid” flags without server-side validation against Stripe truth.

## Entry points

| Entry | Notes |
|-------|-------|
| Public REST API | Auth headers, path/query params, body JSON |
| Stripe webhooks | Raw body + signature header |
| Health/metrics endpoints | Information disclosure if overly verbose |
| Admin routes | JWT + role assumptions; higher impact |
| Background workers | Poison messages, retry storms |

## API surface

- Enumerate routes from OpenAPI/spec or route registration in codebase during review.
- Focus on **state-changing** methods on money-adjacent resources and **cross-user** IDOR patterns.

## Auth / OTP / JWT risks

| Risk | Description | Mitigation direction |
|------|-------------|---------------------|
| Token theft | XSS, device compromise, log leakage | HttpOnly cookies where applicable, short TTL, rotation |
| Algorithm confusion | Misconfigured JWT verification | Library defaults audit, explicit algorithms |
| Refresh abuse | Stolen refresh tokens | Binding, reuse detection, revocation policy |
| OTP leakage | SMS/email intercept, verbose errors | Rate limits, generic errors, secure channels |

## Payment / webhook risks

| Risk | Description | Mitigation direction |
|------|-------------|---------------------|
| Forged webhooks | Missing/invalid signature | Verify signing secret, constant-time compare |
| Replay | Duplicate delivery | Idempotency store (`StripeWebhookEvent` pattern) |
| Ordering races | Pay before inventory/fulfillment ready | State machine + reconciliation |
| Amount tampering | Client tries to change price | Server-side price from catalog |

## Provider / Reloadly risks

| Risk | Description | Mitigation direction |
|------|-------------|---------------------|
| Duplicate fulfillment | Retries without idempotency | `customIdentifier`, inquiry-before-retry policy |
| Wrong operator mapping | Catalog misconfiguration | Strict operator map validation |
| Credential exposure | Keys in env leaks | Secret manager, rotation |

## Ledger / reconciliation risks

| Risk | Description | Mitigation direction |
|------|-------------|---------------------|
| Manual DB “fixes” | Breaks invariants | Governed procedures only |
| Drift | Provider vs internal truth | Reconciliation jobs and admin views |
| Fraudulent refunds | Social engineering support | Authority matrix, dual control |

## Support / admin operational risks

- Over-privileged support tools.
- PII exfiltration via bulk export.
- Social engineering of operators (out of band; train staff).

## Privacy / data risks

- Logging full phone numbers or card data (must not occur; see logging redaction patterns in repo).
- Over-retention of personal data vs policy.

## Abuse / fraud risks

- Rate-limit bypass, credential stuffing on auth endpoints.
- Promo/wallet abuse paths (if applicable to product).

## Mitigations (summary)

- **Defense in depth:** authZ on every sensitive route, webhook signatures, idempotency, rate limits (`RATE_LIMITING.md`, `ABUSE_HARDENING_MATRIX.md`).
- **Least privilege** for secrets and DB roles.
- **Observability** with redaction (`SECRETS_MANAGEMENT.md`, ops logging conventions).

## Residual risks

- Zero-day in dependencies — addressed via patch SLAs and monitoring, not eliminated.
- Third-party outages and fraud — contractual and operational, not purely technical.
- Insider threat — HR + access reviews (evidence in compliance pack).

## Related

- [L38_SECURITY_CONTROL_EVIDENCE_MATRIX.md](./L38_SECURITY_CONTROL_EVIDENCE_MATRIX.md)
- [../PHASE1_IDEMPOTENCY_CONTRACT.md](../PHASE1_IDEMPOTENCY_CONTRACT.md)
- [../TRUST_API_CONTRACT.md](../TRUST_API_CONTRACT.md)
- [../SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md)
