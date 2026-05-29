# CORE-09 Controlled Pilot Gate

**Date:** 2026-05-29  
**Status:** **GATE FILED ONLY**  
**Extends:** CORE-00 pilot preconditions, CORE-03..08 Super-System tracks  
**Default:** **NO-GO** for controlled pilot, real-money, production launch, and market launch

---

## 1. Pilot gate status (required)

| Item | Status |
|------|--------|
| CORE-09 Controlled Pilot Gate | **FILED ONLY** |
| Controlled pilot | **NOT APPROVED** |
| Controlled pilot | **NOT EXECUTED** |
| Real-money launch | **NO-GO** |
| Market launch | **NO-GO** |

This pack **does not** authorize, schedule, or execute a pilot.

---

## 2. Purpose

Define the **controlled pilot gate** for Zora-Walat core corridors (mobile top-up / data — not XCH/CARD/AFG-CARD): entry/exit criteria, exposure limits, evidence checklist, incident response, support readiness, approval boundary, and conservative launch limits.

Builds on merged tracks:

| Track | Role in pilot gate |
|-------|-------------------|
| CORE-03 | Invariants INV-01..07 |
| CORE-04 | Detect-only runtime doctor (local proof) |
| CORE-05 | Duplicate / idempotency kernel (local proof) |
| CORE-06 | No-pay-no-service proof (local proof) |
| CORE-07 | Sandbox drill gate (**if** separately approved + executed) |
| CORE-08 | Safe repair dry-run (**apply NOT ENABLED**) |

---

## 3. Exact authorization phrase (gate review only)

No controlled pilot **gate review** advances without:

```
APPROVE CORE-09 CONTROLLED PILOT GATE ONLY
```

| Rule | Detail |
|------|--------|
| Meaning | Authorizes **gate review and evidence collection planning** only |
| Does **not** authorize | Real-money execution, production provider at scale, market launch |
| Real-money | Requires **later separate CORE-11** go/no-go approval (out of scope) |
| Paraphrases | **INVALID** |
| Recording | [Approval decision record](./ZORA_WALAT_CORE09_APPROVAL_DECISION_RECORD_2026_05_29.md) **CORE9-EV-APPROVAL-001** |

---

## 4. Pack documents

| Document | Role |
|----------|------|
| [Pilot entry criteria](./ZORA_WALAT_CORE09_PILOT_ENTRY_CRITERIA_2026_05_29.md) | Prior evidence required |
| [Pilot exit criteria](./ZORA_WALAT_CORE09_PILOT_EXIT_CRITERIA_2026_05_29.md) | Success / halt conditions |
| [Exposure limits](./ZORA_WALAT_CORE09_PILOT_EXPOSURE_LIMITS_2026_05_29.md) | Caps and prohibitions |
| [Evidence checklist](./ZORA_WALAT_CORE09_PILOT_EVIDENCE_CHECKLIST_2026_05_29.md) | CORE9-EV-* matrix |
| [Incident response & abort](./ZORA_WALAT_CORE09_INCIDENT_RESPONSE_AND_ABORT_PLAN_2026_05_29.md) | Freeze / preserve / review |
| [Support & operator readiness](./ZORA_WALAT_CORE09_SUPPORT_AND_OPERATOR_READINESS_2026_05_29.md) | Ops prerequisites |
| [Approval DR template](./ZORA_WALAT_CORE09_APPROVAL_DECISION_RECORD_2026_05_29.md) | Sign-off template |
| [Conservative verdict](./ZORA_WALAT_CORE09_CONSERVATIVE_VERDICT_2026_05_29.md) | Required status table |

---

## 5. Global prohibitions (pilot and pre-pilot)

- No broad public launch  
- No unbounded provider execution  
- No auto-repair apply  
- No pilot execution in this filing  
- No customer real-money transaction authorized by CORE-09 phrase alone  

---

## 6. Conservative verdict (summary)

Production / real-money / controlled pilot / market launch: **NO-GO**.  
Detail: [Conservative verdict](./ZORA_WALAT_CORE09_CONSERVATIVE_VERDICT_2026_05_29.md).

---

*Ap786 documentation only — no runtime, env, or deploy changes.*
