# L-84 — Risk register

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| R1 | Probe env enabled on production | Critical | Dual gate + production env pre-check | OPEN |
| R2 | Wrong Vercel project linked | Critical | Explicit `zora-walat-api-staging` checklist | OPEN |
| R3 | Token leaked in evidence | High | Redact `X-ZW-Ops-Token`; never commit token | OPEN |
| R4 | Multiple POSTs → log spam | Medium | Exactly one POST policy | OPEN |
| R5 | Log contains secrets/PII | High | L-80 envelope + redaction review before filing | OPEN |
| R6 | False L-74 closure claim | High | Non-claims doc; staging-only synthetic probe | Mitigated in plan |
| R7 | Accidental Stripe/webhook trigger | Critical | Probe-only route; no Stripe in plan | Mitigated in plan |
| R8 | Deploy without execution approval | High | Separate approval gate | OPEN |

## Stop conditions (abort execution)

- Env gate missing after redeploy
- Staging project ambiguous
- Production target appears in env or URL
- Log contains secret/PII/raw payload
- More than one diagnostic line from single proof window
- Route non-fail-closed outside staging
- Any DB/provider/payment path touched
- Deploy required without explicit L-84 execution approval

---

*End.*
