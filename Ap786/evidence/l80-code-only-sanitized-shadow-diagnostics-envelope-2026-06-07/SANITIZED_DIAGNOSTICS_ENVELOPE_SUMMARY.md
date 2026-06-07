# L-80 — Sanitized diagnostics envelope summary

**Module:** `server/src/reliability/shadowSafetyGate/sanitizedDiagnosticsEnvelope.js`

## Safe bounded fields

- `verdict` — ALLOW | BLOCK
- `reasonCodes` — stable CORE-05/CORE-06 codes only
- `shadowModeEnabled` — boolean
- `eventTypeClassification` — Stripe event type string (e.g. `checkout.session.completed`)
- `scenarioClassification` — non-sensitive bucket (e.g. `paid_valid_unique`)
- `correlationFingerprint` — sha256 truncated (16 hex chars)
- `timestamp`, `component`, `source`
- `wouldScheduleFulfillment` — always false
- `idempotencyDecision`, `deliveryDecision` — decision enums only

## Excluded / redacted

- Raw Stripe payload, headers, secrets, tokens, API keys
- Full `acct_`, `evt_`, `cus_`, `cs_` IDs
- Email, phone, customer PII
- Full webhook URLs

## Wiring

`webhookBoundaryHook.js` logs `envelope: serializeSanitizedEnvelopeForLog(...)` when flag enabled. Default flag **OFF** — no log emission.

---

*End.*
