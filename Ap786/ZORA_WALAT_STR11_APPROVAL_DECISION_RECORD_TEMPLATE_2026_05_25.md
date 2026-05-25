# STR-11 Approval Decision Record Template

**Date:** 2026-05-25
**Status:** **TEMPLATE ONLY / NO APPROVAL ISSUED**

---

## Decision Record

| Field | Value |
|-------|-------|
| Decision ID | STR11-DECISION-001 |
| Decision owner | **PENDING** |
| Decision timestamp | **PENDING** |
| Selected next gate | **PENDING** |
| Approval phrase | **PENDING** |
| Branch name | **PENDING** |
| Allowed files | **PENDING** |
| Explicit exclusions | **PENDING** |
| Stop conditions | **PENDING** |

---

## Future Approval Phrases

| Gate | Phrase | Meaning |
|------|--------|---------|
| STR-12 | `APPROVE STR-12 DURABLE NON-MONEY WEBHOOK AUDIT IMPLEMENTATION ONLY` | Allows scoped implementation only, if exact files and tests are specified |
| STR-13 | `APPROVE STR-13 STAGING AUDIT DEPLOYMENT AND INVALID-SIGNATURE PROOF ONLY` | Allows separate staging deployment/proof scope only after STR-12 exists |
| STR-14 | `APPROVE STR-14 SANDBOX CHECKOUT.EXPIRED AUDIT PROOF ONLY` | Allows separate sandbox signed-event proof only after STR-13 evidence exists |

---

## Default Deny

Until a future approval record is completed, the following remain **NOT APPROVED**:

- Implementation.
- DB migration or schema change.
- Deploy/redeploy.
- HTTP probe.
- Stripe resend/replay/test event.
- Vercel operation.
- Payment/order/wallet mutation.
- Env/config/secret change.
- Production/live/real-money/pilot claim.

---

## Required Approval Attachments

Future approval must attach or reference:

- Allowed changeset.
- Audit event model.
- Security/privacy/retention plan.
- Test matrix.
- Rollback/abort plan.
- Validation commands.
- Evidence capture plan.

---

*Decision template - no approval issued by STR-11.*
