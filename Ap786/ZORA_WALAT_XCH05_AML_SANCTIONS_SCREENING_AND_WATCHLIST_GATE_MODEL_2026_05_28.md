# XCH-05 AML / Sanctions Screening And Watchlist Gate Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO SANCTIONS OR AML RUNTIME**

**Related:** [XCH-02 AML contract](./ZORA_WALAT_XCH02_AML_SANCTIONS_SCREENING_CONTRACT_2026_05_28.md)

---

## 1. Sanctions screening gate

| Event | Screen subject | Default |
|-------|----------------|---------|
| Customer onboarding | Name + DOB + jurisdiction | **NOT RUN** |
| Pre-funding | Sender + beneficiary | **NOT RUN** |
| Pre-payout | Beneficiary + bank details | **NOT RUN** |
| Periodic rescreen | Active customers | **NOT SCHEDULED** |

Match result: `clear` \| `potential_match` \| `confirmed_match` \| `unavailable`.

`unavailable` → **fail closed** — no transaction.

---

## 2. Watchlist screening gate

| List type | Scope | Status |
|-----------|-------|--------|
| Global sanctions (OFAC, UN, EU, etc.) | Legal-defined set | **NOT INTEGRATED** |
| Internal deny list | Ops-maintained | **NOT DEPLOYED** |
| PEP lists (future) | Enhanced due diligence | **PLACEHOLDER** |

---

## 3. AML risk score gate

| Input | Weight (proposed) | Status |
|-------|-------------------|--------|
| Customer risk tier | High | **PLACEHOLDER** |
| Corridor risk | High | **PLACEHOLDER** |
| Transaction amount | Medium | **PLACEHOLDER** |
| Velocity | Medium | **PLACEHOLDER** |

Score above threshold → manual review **HOLD**.

---

## 4. False positive handling

| Step | Action |
|------|--------|
| Potential match | **HOLD** transaction |
| Ops investigation | Document decision |
| Cleared | Audit record + release |
| Confirmed | Block + escalate compliance |

No auto-clear without human review for high-severity lists.

---

## 5. Blocked transaction handling

| State | Behavior |
|-------|----------|
| `blocked_sanctions` | Reject; no fund/payout |
| `blocked_aml_policy` | Reject; customer notification per legal |
| `blocked_provider_unavailable` | Fail closed |

---

## 6. Audit record requirements

| Field | Required |
|-------|----------|
| `screeningId` | **YES** |
| `screenedAt` | **YES** |
| `listVersion` | **YES** |
| `matchResult` | **YES** |
| `reviewerId` (if manual) | **YES** |
| `decisionReason` | **YES** |

Immutable append-only log.

---

## 7. Escalation boundary

| Severity | Escalate to |
|----------|-------------|
| Confirmed sanctions match | Compliance + legal **immediately** |
| Repeated false positives | Compliance tuning review |
| Provider list outage | **HOLD all** affected screenings |

---

## 8. Runtime claim boundary

| Claim | Status |
|-------|--------|
| AML/sanctions gate model specified | **YES** |
| Sanctions/AML runtime | **NOT IMPLEMENTED** |
| Compliant screening program | **NOT CLAIMED** |

---

*XCH-05 AML/sanctions gates — no runtime*
