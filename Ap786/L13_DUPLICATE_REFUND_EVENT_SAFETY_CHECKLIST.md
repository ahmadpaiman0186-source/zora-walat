# L-13 — Duplicate refund event safety (checklist only)

**Status:** NOT EXECUTED — readiness checklist only (do **not** mark L-13 PASS until operator proof)  
**Prerequisite:** L-11 PASS (`POST_PAYMENT_INCIDENT_STATUS REFUNDED`, fulfillment count **1**, no second refund)  
**Environment:** Stripe **test mode** + staging API only  
**Policy:** Phase 1 does not auto-refund from app code; `charge.refunded` mirrors incident state via webhook only.

---

## Goal

Prove that a **duplicate** `charge.refunded` delivery (Dashboard resend of the **same** event) does **not**:

- create a second refund in Stripe  
- corrupt `postPaymentIncidentStatus`  
- increase fulfillment count  
- duplicate incident rows unsafely  

---

## Preflight (read-only — before any resend)

1. Confirm L-11 PASS in `L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md`.  
2. Confirm branch and deploy: staging API from `server/` root (`deploy:staging:guard` PASS).  
3. Operator session: `node tools/staging-auth-checkout-operator.mjs login` (local only; never commit token).  
4. Capture **before** enums (no ids, no payloads):

```bash
cd server
node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
node tools/staging-auth-checkout-operator.mjs status-check
```

| Field | Expected **before** resend |
|-------|----------------------------|
| `POST_PAYMENT_INCIDENT_STATUS` | **REFUNDED** |
| `FULFILLMENT_ATTEMPT_COUNT` | **1** |
| `STRIPE_REFUND_ALREADY_EXISTS` | **true** |
| `L11_REFUND_PROOF_VERDICT` | **PASS** (or equivalent post-refund verify PASS) |
| New refund in Stripe Dashboard | **No** (visual check test mode only) |

5. Optional static gate: `npm run zw:doctor -- incidents --json` (operator machine; not CI money action).

---

## Approval gate (required before any action)

Exact line required in operator chat/ticket (this document does **not** execute it):

```text
Approved: L-13 duplicate refund event proof
```

Alternate accepted form (legacy):

```text
Approved: L-13 duplicate refund event proof on staging
```

**Do not** resend events, run `l11-refund-execute`, or create refunds without this approval.

---

## Manual action (test mode only — after approval only)

1. Stripe Dashboard → **Test mode** → Events.  
2. Locate the **same** `charge.refunded` event tied to the L-11 order (suffix reference only in local gitignored notes).  
3. **Resend** that event to the staging webhook endpoint (same discipline as L-4/L-5 — no new refund, no new charge).  
4. **Forbidden:** `l11-refund-execute`, new Dashboard refund, live Stripe, webhook replay from CI.

---

## Verify (read-only — within 5 minutes after resend)

```bash
cd server
node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
node tools/staging-auth-checkout-operator.mjs status-check
```

| Field | Expected **after** resend |
|-------|---------------------------|
| `POST_PAYMENT_INCIDENT_STATUS` | **REFUNDED** (unchanged) |
| `FULFILLMENT_ATTEMPT_COUNT` | **1** (unchanged) |
| `STRIPE_REFUND_ALREADY_EXISTS` | **true** |
| `L13_DUPLICATE_REFUND_EVENT_VERDICT` | **PASS** (record in new Ap786 proof file) |
| Second refund in Stripe | **No** |
| Duplicate fulfillment | **No** |
| Incident corruption | **No** |

---

## Pass criteria (future proof only)

- All **after** enums match **before** for incident + fulfillment count  
- `L13_DUPLICATE_REFUND_EVENT_VERDICT` **PASS** in sanitized evidence  
- No second refund object in Stripe (operator visual check — do not paste ids into git)  
- `assessPhase1RefundOperatorChecklist` would deny duplicate manual refund (`already_recorded_refunded_incident` class) if consulted  

**Until then:** L-13 remains **NOT PASS** in `AP786_ALL_PASSES_INVESTOR_PROOF.md`.

---

## No-second-refund warning

Resending `charge.refunded` is **not** the same as issuing a refund. If Dashboard shows a **new** refund or fulfillment count rises:

- **Stop immediately**  
- Do **not** “fix” with another refund or resend  
- Treat as **CRITICAL** payment-safety incident (`REFUND_DOUBLE_EXECUTION_RISK` / `DUPLICATE_FULFILLMENT_ATTEMPT`)  
- Freeze fulfillment kicks until root cause documented  

---

## Rollback / containment

| Situation | Action |
|-----------|--------|
| Wrong event type resent | Stop; document event type; no new refunds to “fix” |
| Incident flips away from REFUNDED | Freeze fulfillment; open payment-safety incident; enum-only readouts |
| Fulfillment count > 1 | **CRITICAL** — freeze operator fulfillment kicks; no automated repair |
| Stripe shows second refund | Stop proof; treat as L-11 regression; new approval required for any further action |
| Webhook storm / 5xx | Pause resends; check staging logs; no CI auto-resend |

---

## Evidence to capture (sanitized)

- New file: `L13_DUPLICATE_REFUND_EVENT_PROOF.md` (create **after** PASS only)  
- Before/after enum tables (suffix-only order reference)  
- Note: “Dashboard resend of existing charge.refunded (test mode)”  
- Update `AP786_EVIDENCE_INDEX.txt` only after PASS  
- Update investor proof L-13 row only with honest PASS wording  

---

## What zw-doctor / CI will not do

- No webhook resend  
- No refund execution  
- No L-13 PASS in CI  
- CI runs: `npm run zw:doctor -- incidents --strict --ci-static` (static HIGH/CRITICAL only)

---

## Related docs

- `DAY2_L8_L13_EXECUTION_PLAN.md` § L-13  
- `L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md`  
- `L4_STRIPE_WEBHOOK_RESEND_PLAN.md` (resend discipline)  
- `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md`
