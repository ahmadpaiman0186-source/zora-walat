# L-84K — No-secret instruction

**Verdict:** `CORE10-L84K-VERDICT-001: L84K_OPERATOR_KEY_FAMILY_ATTESTATION_GATE_ONLY_NO_ATTESTATION_RECORDED`

## Operator instruction

When providing a key-family attestation in a **future** authorized intake step, respond with **one choice code only** from the allowed list. Do **not** include any of the following:

| Forbidden | Examples (do not send) |
|-----------|------------------------|
| Full secret value | Any complete key or token string |
| Prefix or suffix | First/last characters of a key |
| Partial fragments | Substrings, “starts with sk_”, “ends with …” |
| Screenshots | Vercel UI, Stripe Dashboard, clipboard, terminal |
| Hashes of secrets | Even redacted “proof” of the value |
| Account identifiers tied to secret | If derived from the exposed material |

## What to send instead

Send **exactly one** allowed code, for example:

```text
STRIPE_TEST_SECRET_API_KEY
```

or

```text
OPS_TOKEN_ONLY_NOT_STRIPE
```

No additional secret-adjacent detail is required or permitted.

## Why

L-84G exposure was classified as `WRONG_VALUE_APPEARED_IN_VERCEL_UI_NOT_SAVED_DISCARDED`. No value was saved to evidence. Re-introducing secret material into chat, tickets, or Ap786 would **expand** exposure risk and violate fail-closed governance.

## L-84K action

This gate **defines** the rule only. **No attestation is recorded here.**

---

*End.*
