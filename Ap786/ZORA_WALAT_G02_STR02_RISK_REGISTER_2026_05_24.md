# G-02 — STR-02 Risk Register

**Date:** 2026-05-24
**Gate:** G-02 · STR-02
**Parent:** [execution gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [abort plan](./ZORA_WALAT_G02_STR02_ABORT_AND_ROLLBACK_PLAN_2026_05_24.md)

**Policy:** Risks for **one** sandbox Resend of STR-01 `checkout.session.expired` event. All risks default **OPEN / NOT ACCEPTED**. Execution **NOT AUTHORIZED** until approval phrase issued and checklist complete.

---

## 1. Risk matrix

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|------------|--------|------------|--------|
| **R-STR02-01** | Resend clicked in **live mode** | Low (if checklist followed) | Critical | Sandboxes banner check; abort A-01 | **OPEN** |
| **R-STR02-02** | Resend to **wrong endpoint** (prod URL) | Low | Critical | Endpoint lock in gate + STR-02A confirmation capture | **OPEN** |
| **R-STR02-03** | Resend on **wrong event** | Medium | High | Match STR-01 event id; STR-02A screenshot | **OPEN** |
| **R-STR02-04** | **Second Resend** without approval (duplicate delivery) | Medium | High | One Resend rule; abort plan; idempotency LOG-03 | **OPEN** |
| **R-STR02-05** | Resend before **STR-02A** baseline capture | Medium | High | Phase 3 before Phase 4 in runbook | **OPEN** |
| **R-STR02-06** | HTTP **200** claimed without LOG correlation | Medium | High | LOG-01…LOG-04 required; acceptance criteria | **OPEN** |
| **R-STR02-07** | **Fix proven** claimed prematurely | Medium | Critical | Conservative verdict; human review gate | **OPEN** |
| **R-STR02-08** | Staging DB / order side-effect from replay | Low–Medium | High | Sandbox test-mode; monitor logs; no manual DB “fix” | **OPEN** |
| **R-STR02-09** | Agent/automation clicks Resend | Low | Critical | Agent forbidden; operator-only boundary | **OPEN** |
| **R-STR02-10** | Timeout recurrence (May 19 pattern repeats) | Medium | High | Abort on timeout; no retry without new approval | **OPEN** |
| **R-STR02-11** | Signing secret / env mismatch | Medium | High | DEST-01 filed; no env edit in STR-02 scope | **OPEN** |
| **R-STR02-12** | Production / pilot **NO-GO** bypass | Low | Critical | Explicit NO-GO in all STR-02 docs | **OPEN** |

---

## 2. Risk acceptance (default)

| Field | Value |
|-------|-------|
| Risk acceptance owner | _pending_ |
| Acceptance date | _pending_ |
| STR-02 risks accepted? | **NO** |
| Approval phrase issued? | **NO** |

**No risk is accepted by filing this register.**

---

## 3. Boundary risks (explicit non-scope)

| Risk if expanded | Why out of scope |
|------------------|------------------|
| Production webhook replay | Requires separate gate; **NO-GO** |
| Real-money checkout expire | **NO-GO** |
| Send test events (new event) | Not authorized by STR-02 phrase |
| Deploy / env rotation during STR-02 | Forbidden |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 4. Residual risk after successful STR-02 (if ever executed)

Even with STR-02B HTTP 200 + LOG-01…LOG-04:

| Residual | Status |
|----------|--------|
| Production webhook health | **NOT PROVEN** |
| Live-money path | **NOT PROVEN** |
| Root cause (May 19 timeout) | **NOT CONFIRMED** unless separately reviewed |
| Fix proven in staging | **REVIEW PENDING** — not automatic |
| Pilot / prod launch | **NO-GO** until launch gates pass |

---

## 5. Verdict (default)

| Item | Status |
|------|--------|
| STR-02 risk register | **FILED** |
| Risks accepted | **NO** |
| STR-02 execution | **NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 risk register · all risks OPEN · no Resend executed*
