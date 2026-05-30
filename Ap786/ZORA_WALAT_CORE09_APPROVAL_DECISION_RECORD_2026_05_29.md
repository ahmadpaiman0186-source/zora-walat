# CORE-09 Approval Decision Record

**Date:** 2026-05-29  
**Template:** CORE9-DR-001  
**Default:** **NO-GO**

---

## Decision record — CORE9-DR-___

| Field | Value |
|-------|-------|
| Record ID | CORE9-DR-___ |
| Date (UTC) | _pending_ |
| Pilot corridor | Core top-up / data (Zora-Walat only) |
| Program lead | _pending_ |
| Engineering lead | _pending_ |
| Ops lead | _pending_ |

---

## Authorization boundary

### Gate review phrase (this DR)

| Field | Required |
|-------|----------|
| Exact phrase | `APPROVE CORE-09 CONTROLLED PILOT GATE ONLY` |
| Verbatim on file? | ☐ YES ☐ NO |
| Evidence ID | CORE9-EV-APPROVAL-001 |

**Meaning:** Authorizes **gate review and evidence planning only**.

**Does NOT authorize:**

- Real-money customer transactions  
- Production provider execution at scale  
- Market launch  
- CORE-11 real-money go/no-go (separate future track)

### Pilot execution (future — separate DR)

| Field | Status |
|-------|--------|
| Pilot execution DR id | _not created_ |
| Pilot executed? | **NO** |

### Real-money (CORE-11 — gate filed; execution separate)

| Field | Status |
|-------|--------|
| CORE-11 gate | **FILED ONLY** — [gate](../ZORA_WALAT_CORE11_REAL_MONEY_GO_NO_GO_DECISION_GATE_2026_05_29.md) |
| Gate review phrase | `APPROVE CORE-11 REAL-MONEY GO-NO-GO GATE ONLY` |
| Real-money authorized? | **NO** |
| Real-money executed? | **NO** |

---

## Pre-pilot attestation

| Check | YES / NO / N/A |
|-------|----------------|
| [Entry criteria](./ZORA_WALAT_CORE09_PILOT_ENTRY_CRITERIA_2026_05_29.md) reviewed | |
| [Evidence checklist](./ZORA_WALAT_CORE09_PILOT_EVIDENCE_CHECKLIST_2026_05_29.md) complete | |
| [Exposure limits](./ZORA_WALAT_CORE09_PILOT_EXPOSURE_LIMITS_2026_05_29.md) acknowledged | |
| [Incident / abort plan](./ZORA_WALAT_CORE09_INCIDENT_RESPONSE_AND_ABORT_PLAN_2026_05_29.md) trained | |
| [Support readiness](./ZORA_WALAT_CORE09_SUPPORT_AND_OPERATOR_READINESS_2026_05_29.md) | |
| CORE-04..08 local proofs filed | |
| Auto-repair apply disabled | YES (policy) |

---

## Outcome (default — do not pre-fill as PASS)

| Field | Default |
|-------|---------|
| Controlled pilot gate | **FILED ONLY** |
| Controlled pilot approved | **NO** |
| Controlled pilot executed | **NO** |
| Real-money launch | **NO-GO** |
| Market launch | **NO-GO** |

---

## Signatures

| Role | Name | Date |
|------|------|------|
| Program lead | | |
| Engineering lead | | |
| Ops lead | | |
| Compliance (if applicable) | | |

---

*End of decision record template.*
