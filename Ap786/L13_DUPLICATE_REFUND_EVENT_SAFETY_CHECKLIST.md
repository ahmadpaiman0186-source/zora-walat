# L-13 — Duplicate refund event safety (checklist only)

**Status:** NOT EXECUTED — planning and approval gate only  
**Prerequisite:** L-11 PASS (`POST_PAYMENT_INCIDENT_STATUS REFUNDED`, fulfillment count 1, no second refund)  
**Environment:** Stripe **test mode** + staging API only  
**Policy:** Phase 1 does not auto-refund from app code; `charge.refunded` mirrors incident state via webhook only.

---

## Goal

Prove that a **duplicate** `charge.refunded` delivery (Dashboard resend or second event) does **not**:

- create a second refund in Stripe  
- corrupt `postPaymentIncidentStatus`  
- increase fulfillment count  
- duplicate incident rows unsafely  

Expected steady state after duplicate delivery:

| Field | Expected |
|-------|----------|
| `POST_PAYMENT_INCIDENT_STATUS` | **REFUNDED** (unchanged) |
| Fulfillment attempt count | **1** (unchanged) |
| L11/L13 proof verdict | **PASS** |
| New refund in Stripe | **No** |

---

## Approval gate (required before any action)

Exact line required in operator chat/ticket:

```text
Approved: L-13 duplicate refund event proof on staging
```

**Do not** resend events or execute refunds without this approval.

---

## Safe manual procedure (do not run from CI)

### Before

1. Confirm L-11 PASS evidence in `L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md`.  
2. Run read-only baseline:

```bash
cd server
node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
node tools/staging-auth-checkout-operator.mjs status-check
```

Capture **enum-only** lines (no ids, no payloads).

### Duplicate delivery (test mode only)

3. In Stripe Dashboard (**test mode**), locate the **same** `charge.refunded` event tied to the L-11 order (suffix reference only in local gitignored files).  
4. Use **Resend** on that event to the staging webhook endpoint (same method as L-4/L-5 resend discipline).  
5. **Do not** create a new refund in Dashboard.  
6. **Do not** run `l11-refund-execute`.

### After (within 5 minutes)

7. Re-run read-only:

```bash
node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify
node tools/staging-auth-checkout-operator.mjs status-check
```

8. Compare before/after enums — must be **unchanged** for incident and fulfillment count.

9. Optional: `npm run zw:smoke:staging` (no money mutations).

---

## Pass criteria

- `POST_PAYMENT_INCIDENT_STATUS` remains **REFUNDED**  
- `L11_REFUND_PROOF_VERDICT` / post-refund verify remains **PASS**  
- Fulfillment count **1**  
- No second refund object created in Stripe (operator visual check in Dashboard test mode — do not paste ids into git)  
- `assessPhase1RefundOperatorChecklist` would deny duplicate manual refund (`already_recorded_refunded_incident` class) if consulted

---

## Rollback / abort

| Situation | Action |
|-----------|--------|
| Wrong event resent | Stop; document event type; do **not** issue new refunds to “fix” |
| Incident flips away from REFUNDED | Freeze fulfillment; open payment-safety incident; capture enum-only readouts |
| Fulfillment count > 1 | **CRITICAL** — freeze operator fulfillment kicks; no automated repair |
| Stripe shows second refund | Stop proof; treat as L-11 regression; no further Dashboard actions without new approval |

---

## Evidence to capture (sanitized)

- Before/after enum tables in a new Ap786 file (suffix-only order reference)  
- Note: “Dashboard resend of existing charge.refunded”  
- Update `AP786_EVIDENCE_INDEX.txt` only after PASS  
- Update `AP786_ALL_PASSES_INVESTOR_PROOF.md` with honest L-13 row  

---

## What zw-doctor / CI will not do

- No webhook resend  
- No refund execution  
- L-13 remains **manual** until operator completes this checklist under approval

---

## Related docs

- `DAY2_L8_L13_EXECUTION_PLAN.md` § L-13  
- `L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md`  
- `L4_STRIPE_WEBHOOK_RESEND_PLAN.md` (resend discipline)
