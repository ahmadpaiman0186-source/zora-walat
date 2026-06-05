# L-62 — Provider and webhook evidence requirements (future L-63)

**Date:** 2026-06-05
**Dropzone:** `Ap786/evidence/l63-readonly-provider-webhook-evidence-capture-2026-06-05/operator-captured-redacted/` (created in L-63)
**Staging reference dropzone (L-62):** [operator-captured-redacted](./operator-captured-redacted/) — instructions only

---

## Required artifacts (L-63)

| # | Artifact | L-45 row | Format |
|---|----------|----------|--------|
| 1 | Webhook outcome observability | Row 8 | `WEBHOOK-PAYMENT-PATH-OBSERVABILITY-READONLY-001-redacted.png` |
| 2 | Webhook log enum sample | Row 8 | `WEBHOOK-LOG-ENUM-SAMPLE-READONLY-001-redacted.jsonl` or `.md` |
| 3 | Provider path observability | Row 9 | `PROVIDER-PATH-OBSERVABILITY-READONLY-001-redacted.png` |
| 4 | No checkout / no payment attestation | Safety | `NO-CHECKOUT-NO-PAYMENT-ATTESTATION-001.md` |
| 5 | No webhook replay attestation | Safety | `NO-WEBHOOK-REPLAY-ATTESTATION-001.md` |
| 6 | No provider mutation attestation | Safety | `NO-PROVIDER-MUTATION-ATTESTATION-001.md` |
| 7 | Redaction review | Review | `REDACTION-REVIEW-001.md` |
| 8 | Operator timestamp | Audit | `OPERATOR-TIMESTAMP-001.md` |

---

## Redaction policy

| Forbidden in artifacts |
|------------------------|
| Raw webhook payloads |
| `whsec_*`, Stripe secret keys, provider API keys |
| Env values, DB URLs |
| Full payment IDs, customer PII |
| Unredacted provider account secrets |

---

## Row upgrade ceiling

| Row | Max honest upgrade from L-63 read-only capture |
|-----|-----------------------------------------------|
| 8 Webhook/payment-path | **PARTIAL** or **CAPTURED / PARTIAL** |
| 9 Provider-path | **PARTIAL** or **CAPTURED / PARTIAL** |

**FULLY_PROVEN** requires all 12 L-45 rows **PASS**.

---

*End of provider and webhook evidence requirements.*
