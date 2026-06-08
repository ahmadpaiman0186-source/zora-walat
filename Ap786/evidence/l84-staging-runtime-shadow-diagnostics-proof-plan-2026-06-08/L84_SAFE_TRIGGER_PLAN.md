# L-84 — Safe trigger plan (future execution)

**Not executed in L-84 plan gate.**

## Route (from L-83A code on main)

```
POST /internal/staging/shadow-safety-gate/diagnostic-probe
```

Full URL (staging):

```
https://zora-walat-api-staging.vercel.app/internal/staging/shadow-safety-gate/diagnostic-probe
```

## Trigger rules

| Rule | Requirement |
|------|-------------|
| Count | **Exactly one** POST per proof attempt |
| Body | **Empty** — no JSON payload |
| Auth header | **`X-ZW-Ops-Token: <OPS_HEALTH_TOKEN>`** only (or `Authorization: Bearer` per existing helper — prefer `X-ZW-Ops-Token` to avoid Bearer logging patterns) |
| Stripe | **No** webhook, signature, or Stripe API |
| Payment / order / checkout | **No** |
| Provider | **No** |
| DB | **No** mutation |

## Expected HTTP response (success)

```json
{
  "ok": true,
  "emitted": true,
  "probeId": "l83a_staging_probe_v1",
  "correlationFingerprint": "<16 hex>"
}
```

Status **200**. Response must not include raw envelope or secrets.

## Expected fail-closed (verification samples — optional, separate approval)

| Condition | Expected |
|-----------|----------|
| Gates off | **404** `{ "error": "not_found" }` |
| No token | **401** |
| Non-empty body | **400** |

Production URL probe (if ever attempted) must **404** — not part of primary proof unless explicitly approved for negative control.

## Proposed future command (operator — redact token in evidence)

```powershell
# PLAN ONLY — do not run until L-84 execution approval
curl.exe -sS -X POST `
  "https://zora-walat-api-staging.vercel.app/internal/staging/shadow-safety-gate/diagnostic-probe" `
  -H "X-ZW-Ops-Token: <REDACTED_OPS_HEALTH_TOKEN>" `
  -H "Content-Length: 0"
```

Record: HTTP status, response JSON (bounded fields only), timestamp, deployment ID — **never** paste live token.

## Stop conditions

- More than one POST in proof window without operator reset
- Any Stripe/webhook/payment/checkout invocation
- Trigger against production host
- Route returns 200 when gates should be off

---

*End.*
