# L-84T — Post-rotation proof requirements

**Verdict:** `CORE10-L84T-VERDICT-001: L84T_STRIPE_ROTATION_PLAN_ONLY_EXECUTION_NOT_AUTHORIZED`

## Purpose

Define **required proof artifacts** for **future execution gates** after Stripe rotation and/or OPS token recovery — **without recording any secret material**.

## Stripe rotation proof (future execution gate)

| Artifact | Required content | Secret material |
|----------|------------------|-----------------|
| Execution record | Gate ID, date, authorization phrase, operator confirmations | **NO** |
| Target lock attestation | Project names, env var **names** only | **NO** |
| Rotation performed attestation | Operator confirms Stripe Dashboard roll completed | **NO** |
| Vercel save attestation | Operator confirms correct env var updated on correct project | **NO** |
| No-secret attestation | Prefix/suffix/hash/length all **NO** | **NO** |
| Non-claims | No payment flow proof unless separately authorized | **NO** |

**Minimum factual fields (outcomes only):**

| Field | Example values |
|-------|----------------|
| Stripe live key rotated | YES / NO |
| Old key revoked in Dashboard | YES / NO |
| Correct Vercel Stripe env var updated | YES / NO |
| Wrong field (`OPS_HEALTH_TOKEN`) touched during Stripe step | NO (required) |
| Clipboard cleared after save | YES |

## OPS token recovery proof (future execution gate)

| Artifact | Required content |
|----------|------------------|
| Token generated locally | YES / NO |
| Token printed | **NO** (required) |
| Vercel `OPS_HEALTH_TOKEN` saved on staging | YES / NO |
| Scope Production / Sensitive ON | YES / NO |
| Field contained ops token class (not Stripe) | Operator attestation |
| Clipboard cleared | YES / NO |
| Redeploy executed | YES / NO (separate gate) |

## Redeploy proof (future gate — L-84O pattern)

| Field | Required |
|-------|----------|
| Project | **`zora-walat-api-staging`** |
| Deployment ID | YES (non-secret) |
| Status Ready | YES |
| HTTP/runtime proof | **Separate gate** — not implied by redeploy alone |

## L-84P HTTP proof (future gate — not authorized here)

| Field | Required |
|-------|----------|
| Endpoint | `GET /ops/health` on staging URL |
| Auth header present | YES (token not recorded) |
| Response status / redacted body hash | Per L-84P pattern |
| Token value in evidence | **NO** |

## L-84T boundary

These are **requirements for future gates**. L-84T **does not** collect or file execution proof.

---

*End.*
