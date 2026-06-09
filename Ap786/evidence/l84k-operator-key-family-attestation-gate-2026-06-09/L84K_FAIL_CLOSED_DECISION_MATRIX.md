# L-84K — Fail-closed decision matrix

**Verdict:** `CORE10-L84K-VERDICT-001: L84K_OPERATOR_KEY_FAMILY_ATTESTATION_GATE_ONLY_NO_ATTESTATION_RECORDED`

## Matrix (planning — no attestation recorded)

| Operator choice | Stripe rotation may be required? | Typical env name(s) (names only) | L-84J target lock | Next gate direction |
|-----------------|----------------------------------|----------------------------------|-------------------|---------------------|
| `STRIPE_LIVE_SECRET_API_KEY` | **Evaluate** — high severity | `STRIPE_SECRET_KEY` | **Incomplete until recorded** | Future attestation intake + target lock |
| `STRIPE_TEST_SECRET_API_KEY` | **Evaluate** — test scope | `STRIPE_SECRET_KEY` | **Incomplete until recorded** | Future attestation intake + target lock |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | **Evaluate** — webhook scope | `STRIPE_WEBHOOK_SECRET` | **Incomplete until recorded** | Future attestation intake + target lock |
| `STRIPE_PUBLISHABLE_KEY` | **Evaluate** — publishable scope | `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Incomplete until recorded** | Future attestation intake + target lock |
| `OPS_TOKEN_ONLY_NOT_STRIPE` | **Stripe rotation likely NOT indicated** | `OPS_HEALTH_TOKEN` (L-84 context) | Stripe target lock **N/A** for ops-only | Ops provisioning track — not Stripe Dashboard rotation |
| `UNKNOWN_WORST_CASE` | **Plan worst case** — do not guess execution | All candidates (names only) | **Incomplete** | Remains blocked until resolved |

## Fail-closed rules

| Condition | Action |
|-----------|--------|
| No operator choice recorded | **STOP** — L-84J block unchanged |
| Response contains value/prefix/suffix | **REJECT** — do not record; request code only |
| Multiple conflicting choices | **REJECT** — one code only |
| Attestation received without future authorization gate | **DO NOT** execute rotation |

## L-84K outcome

| Item | Status |
|------|--------|
| Decision matrix filed | **YES** |
| Operator choice applied | **NO** |
| L-84J target lock complete | **NO** |
| Dashboard rotation phrase issued | **NO** |

---

*End.*
