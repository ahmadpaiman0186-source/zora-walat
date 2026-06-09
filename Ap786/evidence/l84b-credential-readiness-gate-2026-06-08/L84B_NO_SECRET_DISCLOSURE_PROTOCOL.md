# L-84B — No secret disclosure protocol

Applies to L-84B gate filing and all future L-84 retry evidence.

## Never record in Ap786

| Secret class | Examples |
|--------------|----------|
| Ops tokens | `OPS_HEALTH_TOKEN`, `ZW_OPS_HEALTH_TOKEN`, `OPS_INFRA_HEALTH_TOKEN`, Bearer values |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, webhook signatures |
| Auth | JWT secrets, admin secrets, operator verify tokens |
| Data | PII, raw webhook payloads, DB connection strings |

## Allowed in evidence

| Item | Format |
|------|--------|
| Env var **names** | Literal name strings only |
| Boolean/non-secret flags | e.g. probe enabled `true`/`false` where not secret |
| HTTP status codes | Numeric only |
| Redacted response bodies | JSON fields without token material |
| Log lines | Sanitized envelope only; redact before filing |

## Operator actions forbidden in evidence capture

- Pasting tokens into markdown, commits, or PR bodies
- Searching repo or env dumps for token values to file as proof
- Screenshot of Vercel env value column (use name + Encrypted label only)

## Validation

- `npm --prefix server run secrets:scan` before any Ap786 commit
- `git diff --check` before commit
- Manual review: no high-entropy strings resembling live tokens

## L-84B gate

This filing contains **names only**. No secret search or live env inspection performed.

---

*End.*
