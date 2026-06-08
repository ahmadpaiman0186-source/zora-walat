# L-84 — Sanitized log capture plan (future execution)

**Not executed in L-84 plan gate.**

## Target log signature

Exactly **one** new log line per approved POST containing:

```json
"event": "shadow_safety_gate_webhook_diagnostic"
```

With nested sanitized `envelope` object from L-83A probe (`component`: `shadow_safety_gate_staging_probe`).

## Capture sources (operator choice)

| Source | Notes |
|--------|-------|
| Vercel staging function logs | Filter by route path or event name |
| Better Stack (if wired to staging API) | Filter `shadow_safety_gate_webhook_diagnostic` |

**Do not** capture full request headers or auth token values.

## Required redactions before filing Ap786 evidence

| Must redact | Method |
|-------------|--------|
| `OPS_HEALTH_TOKEN` / Bearer values | Replace with `[REDACTED]` |
| `Authorization` / `X-ZW-Ops-Token` headers | Omit or redact |
| Any `sk_`, `whsec_`, live secrets | Must not appear |
| Raw Stripe IDs (`evt_`, `cs_`, etc.) | Must not appear |
| Email / phone PII | Must not appear |
| Full webhook payloads | Must not appear |

## Acceptable filed evidence

- Single redacted log JSON snippet showing `event` + sanitized `envelope` fields
- `correlationFingerprint` (16 hex) matching HTTP response
- Timestamp (UTC)
- Staging deployment ID / host confirmation

## Pass criteria (future L-84 execution verdict — not this plan)

| Check | Pass |
|-------|------|
| Exactly one diagnostic line tied to probe POST | Required |
| Envelope `diagnosticsOnly: true` | Required |
| Envelope `wouldScheduleFulfillment: false` | Required |
| No secret/PII leak patterns | Required |

## Stop conditions

- Zero log lines after successful 200
- More than one diagnostic line from single approved POST window
- Log contains secrets, raw tokens, PII, or Stripe IDs
- Cannot confirm log came from staging project/deployment

---

*End.*
