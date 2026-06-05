# L-60 — Operator roles and approvals

**Date:** 2026-06-05

---

## Roles

| Role | Responsibilities | L-60 session |
|------|------------------|--------------|
| **Owner** | Runbook accuracy; gap tracking | Ap786 plan approval |
| **Operator** | Read-only capture; tabletop narration | **NOT assigned capture in L-60** |
| **Reviewer** | Evidence filing review | Local review only — **not independent SRE cert** |

---

## Approval boundaries (future L-61)

Document in `OPERATOR-APPROVAL-BOUNDARY-001.md`:

| Action | Requires phrase |
|--------|-----------------|
| L-61 read-only evidence capture | `APPROVE L-61 READ-ONLY INCIDENT RUNBOOK AND ROLLBACK EVIDENCE CAPTURE ONLY` |
| Live rollback execution | **Separate phrase — NOT L-61** |
| Live incident fire + ack | **Separate phrase — NOT L-61** |
| Alert rule / monitor mutation | **FORBIDDEN** without dedicated authorization |
| Launch-ready claim | **FORBIDDEN** always at current posture |

---

## L-60 issued phrase scope

`APPROVE L-60 READ-ONLY INCIDENT RUNBOOK AND ROLLBACK DRILL PLAN ONLY`

| Authorizes | Does not authorize |
|------------|-------------------|
| Ap786 plan filing | Rollback click |
| Severity matrix + roles docs | Deploy |
| L-61 phrase filing | Evidence capture execution |

---

*End of operator roles and approvals.*
