# L-84F — Secret value handling rules

**Verdict:** `CORE10-L84F-VERDICT-001: L84F_OPERATOR_SECRET_PROVISIONING_EXECUTION_AUTHORIZATION_GATE_ONLY`

Applies to **future** secret provisioning execution. L-84F creates **no secret** and records **no secret value**.

## D. Secret variable lock

| Location | Allowed variable | Forbidden |
|----------|------------------|-----------|
| Vercel (staging) | `OPS_HEALTH_TOKEN` | All other env vars |
| Local shell | `ZW_OPS_HEALTH_TOKEN` | All other env vars |

No other env variable may be added, edited, read, printed, exported, or deleted during future provisioning execution.

## E. Secret generation rule (future execution)

| Rule | Requirement |
|------|-------------|
| Entropy | **High-entropy** only |
| Weak values | **FORBIDDEN** |
| Human-readable / short / reused / guessable | **FORBIDDEN** |
| Commit to repo | **FORBIDDEN** |
| Print to terminal | **FORBIDDEN** |
| Screenshot | **FORBIDDEN** |
| Paste into chat | **FORBIDDEN** |
| Include in evidence markdown | **FORBIDDEN** |
| Store in Ap786 evidence | **FORBIDDEN** |

The Vercel staging value and local shell value must match (same secret, two names) per [L-84E procedure](../l84e-operator-secret-provisioning-procedure-gate-2026-06-09/L84E_LOCAL_SHELL_TOKEN_PROCEDURE.md) — but L-84F does **not** generate or set them.

## Value pairing rule

| Vercel staging | Local shell |
|----------------|-------------|
| `OPS_HEALTH_TOKEN` | `ZW_OPS_HEALTH_TOKEN` |

Both must receive the **same** high-entropy value at future execution — recorded only as **PRESENT** / **SET** with value **REDACTED / NOT RECORDED**.

---

*End.*
