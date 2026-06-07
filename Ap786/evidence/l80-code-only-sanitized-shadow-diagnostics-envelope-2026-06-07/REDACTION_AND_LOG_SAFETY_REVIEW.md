# L-80 — Redaction and log safety review

## Leak vectors identified (pre-L-80)

L-79 boundary log included `orderIdSuffix` (partial raw order id) and decision fields without envelope bounds.

## L-80 mitigations

1. **Envelope builder** — extracts only safe decision enums and codes; never copies `report.diagnostics.orderId` or raw context.
2. **Correlation** — `fingerprintCorrelation()` hashes order/event material; raw IDs never logged.
3. **Defense in depth** — `serializeSanitizedEnvelopeForLog()` runs `redactSensitiveString()` on JSON output.
4. **Pattern coverage** — whsec_, sk_/pk_/rk_ keys, Bearer tokens, URLs, Stripe ID prefixes, email, phone.

## Test proof

`shadowSafetyDiagnosticsEnvelope.test.js` — 13 tests with `sensitiveLeakFixtures.mjs` embedding realistic leak patterns.

---

*End.*
