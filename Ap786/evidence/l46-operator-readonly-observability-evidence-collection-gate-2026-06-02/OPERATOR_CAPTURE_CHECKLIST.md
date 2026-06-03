# L-46 — Operator capture checklist (future execution)

**Status at L-46 filing:** **NOT EXECUTED** — checklist for future operator sessions only.

**Authorization:** Requires explicit L-47 (or successor) approval phrase before any capture.

**Intake folder (create at execution):** `screenshots-redacted/` under this directory.

---

## Pre-capture

- [ ] Explicit approval phrase recorded in session notes
- [ ] Operator confirms read-only mode — no config/deploy/DB/payment changes
- [ ] [REDACTION_POLICY.md](./REDACTION_POLICY.md) reviewed
- [ ] Capture device/browser cleared of unrelated sensitive tabs

---

## Future read-only evidence classes

### Better Stack — uptime

- [ ] **OBS-UPTIME-DETAIL-001** — Better Stack uptime monitor **details page** screenshot (prod hosts visible; secrets redacted)
- [ ] **OBS-UPTIME-TABLE-001** — Better Stack uptime **availability table** screenshot (agreed window; redacted)

### Better Stack — alerts and incidents

- [ ] **OBS-ALERT-ROUTING-002** — Better Stack **alert routing / notification channel** screenshot (extends L-39 filing if needed; redacted)
- [ ] **OBS-INCIDENT-ACK-001** — Better Stack **incident / acknowledgement** screen if available (redacted; mark N/A if no incident history)

### Vercel — production

- [ ] **OBS-VERCEL-DEPLOY-001** — Vercel **production deployment status** screenshot (redacted)
- [ ] **OBS-VERCEL-LOGS-001** — Vercel **production logs read-only query** screenshot (query + timestamp visible; sensitive values redacted)

### Production health

- [ ] **OBS-HEALTH-FRONTEND-001** — Production **frontend health/availability** evidence screenshot (redacted)
- [ ] **OBS-HEALTH-API-001** — Production **API health/availability** evidence screenshot (redacted)

### Money-path observability

- [ ] **OBS-MONEY-DASH-001** — **Money-path observability dashboard** screenshot if available (enums/metrics only; no raw payloads; redacted; mark N/A if dashboard absent)

### SRE / operator sign-off

- [ ] **OBS-SIGN-SRE-001** — **SRE/operator sign-off** screenshot or signed note referencing L-45 matrix rows captured (explicit **NO-GO** if any row open)

---

## Redaction verification checklist

- [ ] No tokens, secrets, webhook signing secrets, or API keys visible
- [ ] No auth headers or internal credentials visible
- [ ] No user PII, customer/order/payment identifiers visible
- [ ] No raw logs with sensitive values visible
- [ ] Personal emails redacted unless essential for proof
- [ ] Filename suffix `-redacted` applied to all PNG/PDF artifacts
- [ ] Second operator or reviewer spot-check completed (recommended)

---

## No-mutation attestation

Operator attests for the capture session:

- [ ] No deploy or redeploy was performed
- [ ] No env, secret, or credential was viewed, printed, rotated, or edited for capture purposes beyond read-only dashboard access
- [ ] No DB, payment, order, wallet, provider, or webhook state was mutated
- [ ] No Runtime Doctor `--apply` or self-healing apply was run
- [ ] No alert rules, monitors, or notification channels were created, edited, or deleted
- [ ] No production-ready, real-money-ready, controlled-pilot-ready, or global-launch-ready claim is made from this capture alone

**Attestation status at L-46 filing:** **N/A — no capture executed**

---

## Post-capture filing (L-47+)

- [ ] Artifacts placed in `screenshots-redacted/`
- [ ] Manifest updated with artifact IDs, dates, and L-45 matrix row cross-reference
- [ ] [PASS_FAIL_CRITERIA.md](./PASS_FAIL_CRITERIA.md) evaluated
- [ ] [CONSERVATIVE_VERDICT.md](./CONSERVATIVE_VERDICT.md) updated only if intake step explicitly authorized

---

*End of L-46 operator capture checklist.*
