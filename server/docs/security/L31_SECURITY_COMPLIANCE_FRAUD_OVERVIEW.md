# L31 — Security, compliance, and fraud overview

**Gate:** L31 = production security posture, fraud controls, compliance evidence assumptions, privacy boundaries, and pre-soft-launch NO-GO criteria.  
**Status:** Documentation/spec only — **NOT RUNTIME VERIFIED** (no pen test, no formal audit sign-off implied).

---

## L31 scope

| In scope | Out of scope (separate gates / counsel) |
|----------|----------------------------------------|
| Technical controls documented in-repo (auth, rate limits, webhooks, lockdown) | **PCI DSS SAQ** completion, bank sponsorship, money transmitter licensing |
| Fraud **detection** and **response** playbooks | **KYC/AML** program design unless product later adds it |
| Privacy/data-handling policy **draft** for engineering/ops | **Legal privacy policy** text published to users |
| Secrets hygiene, rotation triggers, access control runbook | Vendor SOC2 report consumption (track externally) |
| Handoff to L30 (support comms) and L29 (retention/logs) | **L38** formal security review / pen-test sign-off — see §Handoff |

---

## Threat model summary (high level)

| Threat | Primary controls (see codebase/docs) |
|--------|--------------------------------------|
| Stolen user JWT | Short-lived access, refresh path, rate limits (`authLimiter`); staff paths separate |
| Webhook forgery | Stripe signature verification; invalid sig logged as security event |
| Credential stuffing | Auth + checkout limiters; see `ABUSE_HARDENING_MATRIX.md` |
| Insider / staff abuse | `requireStaff`, staff limiters; canonical truth staff-only |
| Payment fraud / velocity | Fraud velocity store, checkout integration; opaque user messages |
| Enumeration / scraping | Read limiters on orders and phase1-truth |
| Secret leakage | `secrets:scan`, `.gitignore`, `SECRETS_MANAGEMENT.md` |
| Provider abuse | Reloadly OAuth, sandbox flags, production rehearsal docs |
| Ledger tampering | Immutable journal semantics — `BACKUP_RESTORE_DRILL.md`, wallet invariant docs |

---

## Compliance scope assumptions (non-binding)

- **Card data:** Stripe-hosted flows; application must not log raw PAN/CVV (redaction paths in logging docs).
- **Records:** Orders, audits, ledger append-only discipline — retention handoff to L29 policy.
- **Regulatory:** Organization-specific; this package **does not** assert licensure or jurisdictional coverage.

---

## Production launch security posture (target)

- Lockdown and CORS policy understood for `PRELAUNCH_LOCKDOWN` vs production (`corsPolicy.js`, `DEPLOYMENT_READINESS.md`).
- Stripe live preflight passed when required (`stripeLiveReadinessPreflight.js`).
- Rate limits and abuse matrix reviewed for money surfaces.
- Secrets injected via platform only; rotation paths documented.
- Fraud and security incidents routable to [`L31_FRAUD_ABUSE_RESPONSE_RUNBOOK.md`](./L31_FRAUD_ABUSE_RESPONSE_RUNBOOK.md).

---

## Dependencies on other L gates

| Gate | L31 dependency |
|------|----------------|
| **L26** | Env/runtime parity, `/ready`, timeout behavior — **NOT VERIFIED**; lockdown semantics may differ until verified |
| **L27** | Webhook signature, dispute path (PR #5) — **NOT VERIFIED** until merged/tested |
| **L28** | Reloadly prod vs sandbox, provider credentials — **PLANNED / NOT VERIFIED** |
| **L29** | Alerting, log retention, evidence export — docs-spec; runtime wiring TBD |
| **L30** | Customer comms, support escalation, authority matrix — docs-spec; fraud handoff |

---

## Verified vs not verified (in-repo)

| Aspect | In-repo documented | Externally verified |
|--------|-------------------|---------------------|
| Rate limit surfaces | Yes (`ABUSE_HARDENING_MATRIX.md`) | Load / abuse testing |
| Webhook signature | Yes (routes + logs) | Ongoing Stripe Dashboard monitoring |
| Secrets classes | Yes (`SECRETS_MANAGEMENT.md`) | Rotation drills, access reviews |
| Formal pen test | No | **L38** / vendor engagement |

---

## Security NO-GO conditions (pre-soft-launch)

- Production money surface **without** reviewed lockdown/CORS and Stripe key mode alignment.
- **Shared** staff/admin secrets across environments; webhook secret in chat or ticket.
- Disabling signature verification or fraud gates to “unstick” traffic.
- Missing **two-person** approval path for high-risk manual recovery (see L30 authority matrix + L31 payment risk matrix).
- No incident channel for `moneyPathAlert` / security-event spikes once live.

---

## Soft-launch security gates (checklist pointers)

Use [`L31_SECURITY_REVIEW_CHECKLIST.md`](./L31_SECURITY_REVIEW_CHECKLIST.md) before widening `OWNER_ALLOWED_EMAIL` / disabling lockdown.

---

## Evidence requirements

- Security incidents: redacted logs, correlation id **suffixes**, ticket ids — see [`L31_PRIVACY_DATA_HANDLING_POLICY.md`](./L31_PRIVACY_DATA_HANDLING_POLICY.md).
- Store evidence under operator evidence folders; no raw `.env` or signing secrets.

---

## Handoff to L38 (formal security review / pen test)

This L31 package **closes the documentation gap** for “what to test and what must hold.” **L38** (or equivalent) should deliver: scoped pen test, retest of findings, and sign-off artifact **outside** this repo unless you add an evidence index entry later.

---

## Related documents

- [`L31_SECURITY_REVIEW_CHECKLIST.md`](./L31_SECURITY_REVIEW_CHECKLIST.md)  
- [`L31_FRAUD_ABUSE_RESPONSE_RUNBOOK.md`](./L31_FRAUD_ABUSE_RESPONSE_RUNBOOK.md)  
- [`L31_PRIVACY_DATA_HANDLING_POLICY.md`](./L31_PRIVACY_DATA_HANDLING_POLICY.md)  
- [`L31_SECRETS_ACCESS_CONTROL_RUNBOOK.md`](./L31_SECRETS_ACCESS_CONTROL_RUNBOOK.md)  
- [`L31_PAYMENT_RISK_COMPLIANCE_MATRIX.md`](./L31_PAYMENT_RISK_COMPLIANCE_MATRIX.md)  
- [`../ABUSE_HARDENING_MATRIX.md`](../ABUSE_HARDENING_MATRIX.md)  
- [`../SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md)
