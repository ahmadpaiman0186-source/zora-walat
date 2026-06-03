# L-46 — Redaction policy (operator-captured evidence)

**Applies to:** All future operator-captured production observability artifacts filed under L-47+ intake.

**L-46 filing:** Policy definition only — no artifacts captured.

---

## Mandatory redaction

The following **must be redacted** (blurred, cropped, or replaced with `[REDACTED]`) before any artifact is committed to Ap786:

| Category | Examples |
|----------|----------|
| **Tokens** | Session tokens, bearer tokens, JWTs, OAuth tokens |
| **Secrets** | Passwords, shared secrets, env var values |
| **Webhook signing secrets** | Stripe/Better Stack/provider webhook secrets |
| **API keys** | Production/staging API keys, service account keys |
| **Auth headers** | `Authorization`, `Cookie`, custom auth headers |
| **User PII** | Names, phone numbers, addresses, government IDs |
| **Customer/order/payment identifiers** | Customer IDs, order IDs, payment intent IDs, wallet IDs when identifiable |
| **Raw logs containing sensitive values** | Log lines with payloads, card data, or credential fragments |
| **Internal credentials** | DB connection strings, Neon credentials, Reloadly keys |
| **Personal emails** | Redact unless essential for proof (e.g., on-call roster role label only) |

---

## Acceptable visible content

| Allowed (when not sensitive) |
|------------------------------|
| Monitor names, host URLs (production domain only) |
| Uptime percentages, status badges, timestamps |
| Alert policy names (not webhook URLs with secrets) |
| Deployment status labels (Ready/Error) without env values |
| Aggregated error counts without raw message bodies |
| Redacted log query strings (no secret parameters) |

---

## Fail criteria

| Condition | Result |
|-----------|--------|
| Any mandatory category visible | **FAIL/BLOCKED** — do not commit |
| Uncertainty whether field is sensitive | **FAIL/BLOCKED** — redact or abort |
| Artifact is unredacted “full screen” dump | **FAIL/BLOCKED** |

---

## Process

1. Capture read-only screenshot or export.
2. Redact locally before save to repo path.
3. Complete redaction verification checklist in [OPERATOR_CAPTURE_CHECKLIST.md](./OPERATOR_CAPTURE_CHECKLIST.md).
4. Use `-redacted` filename suffix.
5. Second review recommended before git add.

---

## L-46 attestation

No operator evidence was captured in L-46. This policy is **filed only** for future sessions.

---

*End of L-46 redaction policy.*
