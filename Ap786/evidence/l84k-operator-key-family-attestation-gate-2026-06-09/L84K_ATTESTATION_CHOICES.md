# L-84K — Attestation choices

**Verdict:** `CORE10-L84K-VERDICT-001: L84K_OPERATOR_KEY_FAMILY_ATTESTATION_GATE_ONLY_NO_ATTESTATION_RECORDED`

**No attestation recorded in L-84K.**

## Purpose

Define the **only** allowed operator key-family attestation codes for future intake. Each choice names a **family only** — never a secret value.

## Allowed choices

| Code | Operator meaning | Typical repo env name(s) (names only) |
|------|------------------|---------------------------------------|
| `STRIPE_LIVE_SECRET_API_KEY` | Material was or resembled a **live** Stripe secret / restricted API key | `STRIPE_SECRET_KEY` (live mode context) |
| `STRIPE_TEST_SECRET_API_KEY` | Material was or resembled a **test** Stripe secret / restricted API key | `STRIPE_SECRET_KEY` (test mode context) |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | Material was or resembled a Stripe **webhook signing** secret | `STRIPE_WEBHOOK_SECRET` |
| `STRIPE_PUBLISHABLE_KEY` | Material was or resembled a Stripe **publishable** key | `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `OPS_TOKEN_ONLY_NOT_STRIPE` | Material was **ops/infra token only** — not Stripe | `OPS_HEALTH_TOKEN`, `OPS_INFRA_HEALTH_TOKEN` |
| `UNKNOWN_WORST_CASE` | Operator cannot classify — **worst-case planning** applies | Target lock remains incomplete until resolved |

## Forbidden in attestation response

- Any secret value, prefix, suffix, or fragment
- Screenshots of keys or env values
- Stripe Dashboard exports containing secrets
- “It looked like sk_live_…” or similar prefix hints

## L-84K status

| Item | Status |
|------|--------|
| Operator choice selected | **NO** |
| Attestation recorded | **NO** |

---

*End.*
