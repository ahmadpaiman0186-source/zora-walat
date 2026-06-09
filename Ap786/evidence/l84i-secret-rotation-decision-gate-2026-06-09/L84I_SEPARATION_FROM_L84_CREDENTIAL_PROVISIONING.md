# L-84I — Separation from L-84 credential provisioning

**Verdict:** `CORE10-L84I-VERDICT-001: L84I_SECRET_ROTATION_DECISION_GATE_ONLY_ROTATION_NOT_EXECUTED`

## Distinct tracks

| Track | Purpose | L-84I status |
|-------|---------|--------------|
| **L-84 credential provisioning** | Staging `OPS_HEALTH_TOKEN` + local `ZW_OPS_HEALTH_TOKEN` for diagnostic probe path | **NOT PROVISIONED** (L-84G blocked) |
| **L-84I / future rotation** | Stripe key rotation decision after L-84H exposure triage | **DECISION ONLY** — not executed |

## Must remain separate

| Rule | Requirement |
|------|-------------|
| Future rotation execution | **Separate gate** from L-84 secret provisioning |
| Approval phrases | Rotation: `APPROVE STRIPE KEY ROTATION EXECUTION ONLY` · Provisioning: `APPROVE L-84 SECRET PROVISIONING EXECUTION ON STAGING ONLY` |
| Combined execution | **FORBIDDEN** without explicit dual authorization |

## Staging ops token (unchanged)

| Variable | Status |
|----------|--------|
| `OPS_HEALTH_TOKEN` on `zora-walat-api-staging` | **NOT PROVISIONED** |
| L-84 retry | **NOT AUTHORIZED** |

---

*End.*
