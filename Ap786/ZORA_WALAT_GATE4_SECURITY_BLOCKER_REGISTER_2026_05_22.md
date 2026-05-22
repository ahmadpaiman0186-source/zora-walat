# Zora-Walat — Gate 4 Security Blocker Register

**Date:** 2026-05-22
**Gate:** 4 — Security and credential blockers
**Approval pack:** [ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md](./ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md)
**Program register:** [ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md](./ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md)

**Policy:** Placeholder owner roles only. **No** invented approvals or ticket IDs.
**Related:** Staging webhook timeout — [STRIPE_WEBHOOK_FAILURE_BLOCKER_REGISTER](./ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_BLOCKER_REGISTER_2026_05_22.md) (STRIPE-WH-001).

---

## 1. Purpose

Register **security and credential blockers** that prevent Gate 4 exit, production launch, and downstream gates until evidence and approvals are filed.

---

## 2. Security blocker model

| Severity | Launch impact |
|----------|---------------|
| **Critical** | Blocks prod deploy, live-money, Gate 4 exit |
| **High** | Blocks rotation execute; may block pilot |
| **Medium** | Blocks attestation; diligence risk |
| **Low** | Track burn-down |

---

## 3. Critical blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-C01 | Credential | G-01 rotation execute **BLOCKED** | Critical | **BLOCKED** | Security Owner | No approved rotation program | `SEC-G01-EXEC-001`; rotation matrix | Security + ops | G-01 filed after Gate 4 | Complete approval pack review |
| BL-G4-C02 | Env | Production env **NOT APPROVED** | Critical | **NOT APPROVED** | SRE / Operations Owner | Prod deploy unsafe | `SEC-APPR-G4-001`; PE checklist | Security + Engineering | Prod env approval record | Document env names only |
| BL-G4-C03 | Stripe | Live Stripe secret **NOT APPROVED** | Critical | **NOT APPROVED** | Payments Owner | Real-money **NO-GO** | Stripe approval; G-04 | Payments + Security | Live key approval separate from test | Maintain test mode only |
| BL-G4-C04 | Launch | Production launch **NO-GO** | Critical | **NO-GO** | Product Owner | Gate 4 incomplete | All Gate 4 artifacts | LAUNCH gate | Gate 4 exit + downstream gates | No deploy claim |

---

## 4. High-risk blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-H01 | Neon | Prod `DATABASE_URL` **NOT APPROVED** | High | **NOT APPROVED** | Engineering Owner | DB access ungoverned | `SEC-INV-003`; custody LP-04 | Security Owner | Prod DB approval filed | Inventory row only |
| BL-G4-H02 | Webhook | Prod webhook secret **NOT APPROVED** | High | **NOT APPROVED** | Payments Owner | Signature verification unproven | Webhook rotation plan | Payments + Security | Staging tests + prod approval | No replay |
| BL-G4-H03 | Vercel | Vercel prod tokens/env **NOT APPROVED** | High | **NOT APPROVED** | SRE / Operations Owner | Hosting secrets unapproved | Vercel checklist | Security Owner | Vercel approval filed | No dashboard mutation |
| BL-G4-H04 | Custody | Secret custody proof **PENDING EVIDENCE** | High | **PENDING EVIDENCE** | Security Owner | Cannot attest hygiene | Custody checklist filed | Security Owner | `SEC-CUSTODY-001` | Execute checklist rows |
| BL-G4-H05 | Sign-off | Stakeholder sign-off **PENDING REVIEW** | High | **PENDING REVIEW** | Product Owner | External approval language blocked | Gate 1 `SIGN-APPR-*` | Stakeholders | Gate 1 exit | Route Gate 1 packet |

---

## 5. Credential blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-CR01 | Rotation | Credential rotation **NOT EXECUTED** | High | **NOT EXECUTED** | Security Owner | Stale/compromised cred risk | Post-rotation validation | G-01 | Rotation verified | Plan only — no execute |
| BL-G4-CR02 | Inventory | Credential inventory incomplete | Medium | **PENDING EVIDENCE** | Security Owner | Unknown attack surface | `SEC-INV-001` labels | Security Owner | All classes inventoried | Fill inventory template |
| BL-G4-CR03 | Firebase | Firebase prod creds **NOT APPROVED** | High | **NOT APPROVED** | Security Owner | Auth surface risk | Firebase checklist | Security + Engineering | Prod Firebase approval | Review IAM |

---

## 6. Access-control blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-AC01 | MFA | MFA attestation **PENDING EVIDENCE** | High | **PENDING EVIDENCE** | Security Owner | Account takeover risk | MFA-01…06 evidence | Security Owner | Vendor MFA screenshots (redacted) | Request attestations |
| BL-G4-AC02 | Operator | Prod operator access list missing | High | **PENDING EVIDENCE** | Security Owner | Over-privileged ops | OP-02 list | Product Owner | Role list filed | Define roles only |
| BL-G4-AC03 | Least privilege | Prod least privilege **NOT PROVEN** | High | **NOT PROVEN** | Security Owner | Lateral movement risk | LP checklist | Security Owner | LP rows filed | Review Stripe/Vercel roles |

---

## 7. CI/CD blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-CI01 | CI | CI secret inventory **PENDING EVIDENCE** | Medium | **PENDING EVIDENCE** | Engineering Owner | CI compromise → deploy | CI-01 names only | Engineering Owner | Inventory filed | List secret names |
| BL-G4-CI02 | Scan | `secrets:scan` ≠ prod approval | Medium | **BLOCKED** (misclaim) | Security Owner | False security confidence | Custody + env approval | Security Owner | No launch claim on scan alone | Document boundary |

---

## 8. Stripe / payment security blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-P01 | Money | Global money-path **PARTIAL / BLOCKED** | Critical | **BLOCKED** | Payments Owner | Live-money **NO-GO** | Gate 5 + G-04 | Payments + IC | Money-path prod proof | No live charges |
| BL-G4-P02 | Webhook | Webhook replay **BLOCKED** | High | **BLOCKED** | Payments Owner | Double-apply risk | IC approval per replay | IC + Payments | Ticketed replay only | Forbid agent replay |
| BL-G4-P03 | Pilot | Controlled live-money pilot **NO-GO** | Critical | **NO-GO** | Product Owner | Unapproved exposure | Pilot gate record | Board + Payments | Pilot approval filed | Maintain NO-GO |

---

## 9. DB security blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-DB01 | DB | DB migration **BLOCKED** without approval | High | **BLOCKED** | Engineering Owner | Schema risk | Migration ticket | Engineering + Security | Approved migration only | No agent migrations |
| BL-G4-DB02 | DB | Prod DB write from agents **FORBIDDEN** | Critical | **BLOCKED** | Engineering Owner | Data integrity | Policy attestation | Security Owner | Zero agent DB writes | Enforce in runbooks |

---

## 10. Observability / security blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-O01 | OBS | Prod observability **NOT PROVEN** | High | **PLAN ONLY** | SRE / Operations Owner | Blind incident response | Gate 3 artifacts | SRE Owner | Gate 3 exit | Parallel Gate 3 track |
| BL-G4-O02 | Drill | Credential drill **NOT EXECUTED** | Medium | **NOT EXECUTED** | Security Owner | IR unproven | DRILL-G3-10 record | Security Owner | Tabletop filed | Schedule tabletop |

---

## 11. Self-healing security blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-SH01 | Super-System | Self-healing apply **GATED / NOT ENABLED** | Critical | **GATED** | Product Owner | Autonomous mutation risk | G-10 policy | Product + Security | Apply remains disabled | No apply enablement |

---

## 12. Legal / compliance placeholder blockers

| Blocker ID | Domain | Description | Risk level | Current status | Placeholder owner role | Why it blocks launch or later gates | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|------------|----------------|------------------------|-------------------------------------|-------------------|-------------------|---------------|-------------|
| BL-G4-L01 | Compliance | Regulatory review **PENDING** (placeholder) | Medium | **PENDING REVIEW** | Compliance / Legal Reviewer | External diligence | Legal sign-off placeholder | Compliance / Legal Reviewer | Legal row filed | Assign when entity ready |

---

## 13. Owner placeholders (summary)

| Role | Blocker IDs (primary) |
|------|---------------------|
| Security Owner | BL-G4-C01, H04, CR*, AC*, SH01 |
| Payments Owner | BL-G4-C03, H02, P* |
| Engineering Owner | BL-G4-H01, CR03, CI01, DB* |
| SRE / Operations Owner | BL-G4-C02, H03, O01 |
| Product Owner | BL-G4-C04, H05, P03, SH01 |
| Compliance / Legal Reviewer | BL-G4-L01 |

---

## 14. Escalation path

| Level | Trigger | Action |
|-------|---------|--------|
| L1 | High blocker > 14d | Owner role review |
| L2 | Critical blocker | IC + Security Owner |
| L3 | Suspected credential compromise | Emergency rotation path — **human execute only** |
| L4 | Launch pressure vs NO-GO | Product Owner + board — **no** bypass Gate 4 |

---

## 15. Exit criteria (Gate 4 register)

Gate 4 security blockers **closed** only when:

1. All **Critical** rows (BL-G4-C*) reach exit criteria with filed evidence.
2. Custody checklist and rotation matrix approvals filed (no secret values).
3. G-01 remains **BLOCKED** until explicit `SEC-G01-EXEC-001` after Gate 4 review.
4. Program **NO-GO** unchanged until LAUNCH gate.

**Current:** **APPROVAL REQUIRED** — register filed; blockers **open**.

---

## 16. Burn-down roadmap

| Phase | Focus | Target outcomes |
|-------|-------|-----------------|
| **Q1** | Inventory + custody checklist (labels only) | `SEC-INV-001`, `SEC-CUSTODY-001` |
| **Q2** | MFA + access attestations | MFA rows **PENDING EVIDENCE** → filed |
| **Q3** | Rotation plans approved (no execute) | Matrix rows **APPROVED** |
| **Q4** | G-01 execute (Track H only) | **NOT SCHEDULED** — user approval required |
| **Parallel** | Gate 1 + Gate 3 | Do not conflate with Gate 4 |

---

## 17. Final verdict

| Verdict | Value |
|---------|-------|
| **Gate 4** | **APPROVAL REQUIRED / PENDING REVIEW** |
| **Critical blockers** | **Open** |
| **Credential rotation** | **NOT EXECUTED** |
| **Production launch** | **NO-GO** |

---

*Gate 4 Security Blocker Register · placeholder roles · not production-ready*
