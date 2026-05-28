# XCH-05 Compliance Observability And Audit Evidence Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / MARKERS NOT DEPLOYED**

---

## 1. Compliance event markers (future)

Proposed structured log prefix: `ZW_COMPLIANCE_OBSERVABILITY`

| Event | Marker suffix |
|-------|---------------|
| Corridor gate check | `corridor_gate_checked` |
| Corridor blocked | `corridor_blocked` |
| KYC state change | `kyc_state_transition` |
| AML screen completed | `aml_screen_completed` |
| Sanctions match | `sanctions_match_detected` |
| Manual review opened | `manual_review_opened` |
| Manual review decided | `manual_review_decided` |

**Not implemented** in current product.

---

## 2. KYC/KYB evidence markers

| Evidence | Contents |
|----------|----------|
| Verification request | `verificationId`, provider ref, timestamp |
| Verification outcome | Result enum + risk tier |
| Manual override | Approver + reason |

No raw document content in logs.

---

## 3. AML/sanctions evidence markers

| Evidence | Contents |
|----------|----------|
| Screening request | Subjects hashed/tokenized |
| List version | Provider list ID |
| Match disposition | clear / potential / confirmed |

---

## 4. Manual review evidence markers

| Field | Required |
|-------|----------|
| `caseId` | **YES** |
| `triggerType` | **YES** |
| `decision` | **YES** |
| `actorId` | **YES** |
| `decidedAt` | **YES** |

---

## 5. Corridor decision evidence

| Record | Stored when |
|--------|-------------|
| Legal memo reference | Corridor approval (future) |
| Gate checklist signoff | Each gate pass |
| Corridor enable/disable audit | Config change |

---

## 6. Immutable audit expectations

Align with [XCH-04 audit trail](./ZORA_WALAT_XCH04_AUDIT_TRAIL_AND_IMMUTABILITY_REQUIREMENTS_2026_05_28.md):

- Append-only compliance audit store
- No UPDATE/DELETE on decision records
- Correlation IDs across gates

---

## 7. Incident evidence capture

| Incident | Minimum capture |
|----------|-----------------|
| Sanctions false negative (hypothetical) | Full screening audit chain |
| Wrong corridor release | Gate checklist + approver IDs |
| PII in logs | Redaction proof + root cause |

Store under `Ap786/evidence/` when captured — **no XCH-05 captures filed**.

---

## 8. Compliance audit readiness blocker

| Blocker | Status |
|---------|--------|
| Markers deployed | **NO** |
| Immutable compliance store | **NO** |
| Sample audit trail export | **NOT PRODUCED** |
| External audit readiness | **NO-GO** |

---

*XCH-05 compliance observability — not deployed*
