# Zora-Walat — Gate 4 Secret Custody and Access Control Checklist

**Date:** 2026-05-22
**Gate:** 4 — Secret custody and access control
**Approval pack:** [ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md](./ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md)

**Policy:** **COMPLETE** only where existing evidence proves the row. No secret values in filed artifacts.

---

## 1. Purpose

Checklist to prove **secret custody**, **least privilege**, and **access control** before credential rotation execute or production env approval.

---

## 2. Secret custody model

| Layer | Custodian (placeholder) | Storage | Status |
|-------|-------------------------|---------|--------|
| Production secrets | Security Owner + SRE / Operations Owner | Vendor consoles / hosting — **not** git | **PENDING EVIDENCE** |
| Staging secrets | Engineering Owner | Isolated staging store | **PENDING REVIEW** |
| CI secrets | Engineering Owner | GitHub encrypted secrets | **PENDING REVIEW** |
| Evidence artifacts | All roles | `Ap786/evidence/security-2026-05-22/` | **PENDING EVIDENCE** |

---

## 3. Access-control principles

| Principle | Status |
|-----------|--------|
| Least privilege | **PENDING REVIEW** |
| MFA on admin accounts | **PENDING EVIDENCE** |
| No shared prod passwords in chat | **APPROVAL REQUIRED** (policy) |
| Quarterly access review | **NOT PROVEN** |
| Revoke on offboarding | **NOT EXECUTED** |

---

## 4. Least privilege checklist

| Row | Control | Status |
|-----|---------|--------|
| LP-01 | Prod DB access limited to break-glass roles | **PENDING EVIDENCE** |
| LP-02 | Stripe Dashboard roles minimized | **NOT APPROVED** |
| LP-03 | Vercel team roles reviewed | **PENDING REVIEW** |
| LP-04 | Neon role separation (app vs admin) | **PENDING EVIDENCE** |
| LP-05 | Firebase IAM least privilege | **PENDING EVIDENCE** |
| LP-06 | CI secrets scoped to required workflows | **PENDING REVIEW** |
| LP-07 | Operator API scopes minimal | **PARTIAL** (staging P-2) |

---

## 5. MFA / account security checklist

| Row | Control | Status |
|-----|---------|--------|
| MFA-01 | GitHub org MFA enforced | **PENDING EVIDENCE** |
| MFA-02 | Vercel account MFA | **PENDING EVIDENCE** |
| MFA-03 | Stripe account MFA | **PENDING EVIDENCE** |
| MFA-04 | Neon account MFA | **PENDING EVIDENCE** |
| MFA-05 | Firebase console MFA | **PENDING EVIDENCE** |
| MFA-06 | Operator admin MFA | **PENDING EVIDENCE** |

---

## 6. Credential storage checklist

| Row | Control | Status |
|-----|---------|--------|
| CS-01 | No secrets in git tracked files | **COMPLETE (CI)** — `secrets:scan` |
| CS-02 | No secrets in Ap786 evidence | **APPROVAL REQUIRED** (process) |
| CS-03 | `.env*` not committed | **COMPLETE (CI)** — scan scope |
| CS-04 | Production secrets only in approved store | **NOT APPROVED** |
| CS-05 | Staging ≠ production secret reuse | **PENDING REVIEW** |
| CS-06 | Inventory labels only (`SEC-INV-001`) | **PENDING EVIDENCE** |

---

## 7. Secret scanning checklist

| Row | Control | Status |
|-----|---------|--------|
| SS-01 | `npm run secrets:scan` in CI | **COMPLETE (CI scope)** |
| SS-02 | Pre-commit / PR scan policy | **PENDING REVIEW** |
| SS-03 | Post-rotation scan if repo touched | **NOT EXECUTED** |
| SS-04 | No high-confidence patterns in Ap786 | **COMPLETE (CI)** — ongoing |

**Note:** CI scan **≠** production secret hygiene proof.

---

## 8. CI/CD secret checklist

| Row | Control | Status |
|-----|---------|--------|
| CI-01 | GitHub secrets inventory (names only) | **PENDING EVIDENCE** |
| CI-02 | Rotation procedure documented | **PENDING EVIDENCE** |
| CI-03 | No prod DB URL in CI unless required | **PENDING REVIEW** |
| CI-04 | Workflow least privilege | **PENDING REVIEW** |
| CI-05 | Fork PR secret isolation | **PENDING REVIEW** |

---

## 9. Production env checklist

| Row | Control | Status |
|-----|---------|--------|
| PE-01 | Production env approval record | **NOT APPROVED** |
| PE-02 | Vercel prod env vars documented (names) | **PENDING EVIDENCE** |
| PE-03 | No test Stripe keys in prod | **NOT APPROVED** |
| PE-04 | `DATABASE_URL` prod isolated | **NOT APPROVED** |
| PE-05 | Webhook endpoint prod URL registered | **PENDING EVIDENCE** |
| PE-06 | Deploy requires LAUNCH gate | **BLOCKED** |

---

## 10. Staging env checklist

| Row | Control | Status |
|-----|---------|--------|
| SE-01 | Staging env isolated from prod | **PENDING REVIEW** |
| SE-02 | Test Stripe keys only | **IN USE (staging)** |
| SE-03 | Staging DB no prod PII | **PENDING EVIDENCE** |
| SE-04 | Staging webhook separate secret | **PENDING REVIEW** |

---

## 11. Operator access checklist

| Row | Control | Status |
|-----|---------|--------|
| OP-01 | Operator auth reliability (P-2) | **COMPLETE (staging scope)** |
| OP-02 | Prod operator access list (roles) | **PENDING EVIDENCE** |
| OP-03 | Session/token storage secure | **NOT PROVEN** (prod) |
| OP-04 | Break-glass procedure documented | **PROPOSED** (runbook) |
| OP-05 | Operator action audit logs | **NOT PROVEN** (prod) |

---

## 12. Audit trail checklist

| Row | Control | Status |
|-----|---------|--------|
| AT-01 | Vendor audit logs enabled (Stripe/Vercel/Neon) | **PENDING EVIDENCE** |
| AT-02 | Application operator action logs | **NOT PROVEN** (prod) |
| AT-03 | Credential change ticket linkage | **NOT EXECUTED** |
| AT-04 | Gate 4 approval artifact retention | **PENDING EVIDENCE** |

---

## 13. Incident response checklist (credential)

| Row | Control | Status |
|-----|---------|--------|
| IR-01 | Credential incident runbook section | **PROPOSED** (PR #37 IR doc) |
| IR-02 | DRILL-G3-10 tabletop executed | **NOT EXECUTED** |
| IR-03 | Emergency rotation path defined | **COMPLETE (docs)** |
| IR-04 | Post-incident rotation filed | **NOT EXECUTED** |

---

## 14. Revocation checklist

| Row | Control | Status |
|-----|---------|--------|
| RV-01 | Revocation procedure per credential class | **PENDING EVIDENCE** |
| RV-02 | Offboarding access removal SLA | **NOT PROVEN** |
| RV-03 | Compromised key invalidate procedure | **PENDING EVIDENCE** |
| RV-04 | Webhook secret invalidate on rotate | **NOT EXECUTED** |

---

## 15. Evidence naming and storage rules

| Rule | Requirement |
|------|-------------|
| Path | `Ap786/evidence/security-2026-05-22/` |
| Filename | `SEC-{category}_{YYYYMMDD}_{scope}.pdf` or `.md` |
| Content | Ticket IDs, role names, dates — **no** secret values |
| Reject | Any artifact with visible key material |

---

## 16. Current status (summary)

| Category | COMPLETE | PENDING / NOT APPROVED |
|----------|----------|-------------------------|
| CI `secrets:scan` | 2 rows (CI scope) | — |
| Staging P-2 operator | 1 row (staging) | — |
| Production custody | 0 | All prod rows |
| Gate 4 custody proof | — | **PENDING EVIDENCE** |
| Secret custody (overall) | **NOT PROVEN** (production) |

**Do not** mark Gate 4 or production env **COMPLETE** without filed approvals.

---

*Gate 4 Custody Checklist · no secret values · not production-ready*
