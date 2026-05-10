# L38 — Launch-blocking security findings policy

Defines which security issues **block** public or soft launch until remediated, retested, or formally excepted.

## Launch-blocking categories

| Category | Description |
|----------|-------------|
| **AUTHZ-AUTHN** | Authentication/authorization bypass affecting customer or admin assets |
| **PAY-WEBHOOK** | Payment or webhook integrity failure (signature, idempotency) |
| **MONEY-PATH** | Unsafe provider/ledger behavior risking double-spend or silent loss |
| **SECRETS** | Live credentials exposed or trivially recoverable |
| **DATA** | Critical PII exposure at scale or unlawful processing |
| **AVAIL-ABUSE** | Trivial remote crash/data corruption of core service without auth (context-dependent) |

## SEV mapping

| Finding severity | Typical launch impact |
|------------------|----------------------|
| **Critical** | **Hard stop** — no public launch; soft launch only with explicit exception and compensating controls |
| **High** | **Hard stop** for categories PAY-WEBHOOK, SECRETS, MONEY-PATH; others case-by-case |
| **Medium** | Track; may soft-launch with time-bound remediation plan |
| **Low** | Usually non-blocking; backlog |

## Public launch hold policy

Public launch (unrestricted marketing, general audience) is **on hold** if any **Critical** open issue exists in categories AUTHZ-AUTHN, PAY-WEBHOOK, MONEY-PATH, or SECRETS.

## Soft launch hold policy

Controlled soft launch may proceed only if:

- No **Critical** open issues in PAY-WEBHOOK / SECRETS / MONEY-PATH.
- Any **High** AUTHZ-AUTHN issues have compensating controls (e.g. feature disabled) **and** signed risk acceptance.

## Exception process

1. Document finding id, severity, residual risk.
2. Propose **compensating control** (monitoring, feature flag, manual review).
3. **Signoff:** Security lead + Engineering director + (if payment) Finance delegate.
4. Time-bound remediation date (no permanent exceptions for Critical).

## Compensating controls

Examples (must be operational, not paper-only):

- Disable affected endpoint via feature flag.
- Additional WAF rule with verified effectiveness.
- Manual reconciliation for a bounded cohort (short term only).

## Signoff authority

| Decision | Authority |
|----------|-----------|
| Waive launch block | Security lead + Eng director (payment issues + Finance) |
| Accept residual risk | Same; legal if privacy/regulatory |

## Evidence requirements

- Redacted retest or static analysis showing control effectiveness.
- Ticket links; no secrets in signoff packet.

## NO-GO conditions

- “Launch anyway” with known webhook signature bypass.
- Disabling `PRELAUNCH_LOCKDOWN` or production safety gates to hide issues.
- Using production customers as first testers for unvalidated auth changes.

## Related

- [L38_SECURITY_CONTROL_EVIDENCE_MATRIX.md](./L38_SECURITY_CONTROL_EVIDENCE_MATRIX.md)
- [../PRODUCTION_MONEY_PATH_CHECKLIST.md](../PRODUCTION_MONEY_PATH_CHECKLIST.md)
- [../PHASE1_PRODUCTION_SAFETY_GATES.md](../PHASE1_PRODUCTION_SAFETY_GATES.md)
