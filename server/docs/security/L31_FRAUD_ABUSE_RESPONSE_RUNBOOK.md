# L31 — Fraud and abuse response runbook

**Audience:** Security champion, on-call engineer, L2 support (triage).  
**Customer-facing text:** hand off to [`../support/L30_CUSTOMER_COMMUNICATION_TEMPLATES.md`](../support/L30_CUSTOMER_COMMUNICATION_TEMPLATES.md) — never accuse the customer directly.

---

## Shared fields (all scenarios)

- **Evidence:** correlation id suffixes, approximate timestamps, redacted aggregates — no PAN, no `whsec_`, no JWTs in shared chat.
- **Forbidden globally:** disabling Stripe signature verification; turning off all rate limits in prod; pasting secrets into tickets.

---

### 1. Suspicious payment pattern

| Field | Guidance |
|-------|----------|
| **Detection** | Velocity alerts, multiple PI from one IP/device, unusual amount clustering, `fraud_risk`-class blocks in logs |
| **Severity** | P1–P0 if loss velocity |
| **First 5 minutes** | Preserve logs; identify scope (single user vs ring); avoid blocking entire NAT without review |
| **Diagnostics** | Stripe Radar (if enabled), internal velocity keys, checkout audit |
| **Allowed actions** | Temporary rate tighten **via config** with change record; escalate to finance |
| **Forbidden actions** | Public accusation; manual refund to “see if stolen card” without process |
| **Escalation** | Security + finance |
| **L30 handoff** | Neutral “under review” template; no fraud wording |
| **Evidence** | Anonymized histograms, Stripe payment id suffixes |
| **Closure** | Risk contained; rules tuned; false-positive review |

---

### 2. Refund / dispute spike

| Field | Guidance |
|-------|----------|
| **Detection** | Sudden refund requests; Stripe dispute count; `postPaymentIncident` patterns |
| **Severity** | P1 |
| **First 5 minutes** | Segment by SKU/country; check for single BIN or merchant error |
| **Diagnostics** | Stripe Dashboard disputes; fulfillment failure correlation |
| **Allowed actions** | Finance-led holds; feature flag review with legal |
| **Forbidden actions** | Bulk refund script without dual control |
| **Escalation** | Finance + legal if systemic |
| **L30 handoff** | Refund/dispute received template |
| **Evidence** | Dispute id suffixes, cohort stats |
| **Closure** | Root cause class documented; monitoring updated |

---

### 3. Repeated failed OTP / login

| Field | Guidance |
|-------|----------|
| **Detection** | Auth limiter trips; OTP failures from same IP/email cluster |
| **Severity** | P2 (P1 if credential stuffing across accounts) |
| **First 5 minutes** | Distinguish user typo vs attack |
| **Diagnostics** | Geo velocity; user agent diversity |
| **Allowed actions** | Temporary IP throttle **if** WAF/vendor supports; captcha backlog item |
| **Forbidden actions** | Locking all accounts in a country |
| **Escalation** | Security if distributed attack |
| **L30 handoff** | Account access issue template |
| **Evidence** | Rate-limit metrics, sample timestamps |
| **Closure** | Attack mitigated or benign spike confirmed |

---

### 4. Rate-limit spike

| Field | Guidance |
|-------|----------|
| **Detection** | 429 surge; marketing event vs abuse |
| **Severity** | P2 |
| **First 5 minutes** | Tag by route (catalog vs checkout) |
| **Diagnostics** | Compare to launch traffic plan |
| **Allowed actions** | Adjust campaign or temporary limit **with owner** |
| **Forbidden actions** | Disabling limiters globally |
| **Escalation** | Product if legitimate traffic |
| **L30 handoff** | Only if customers complain — generic delay wording |
| **Evidence** | Route breakdown |
| **Closure** | Baseline restored |

---

### 5. Duplicate / replayed webhook spike

| Field | Guidance |
|-------|----------|
| **Detection** | `webhook_duplicate_ignored` rate; Stripe retry storm |
| **Severity** | P1 if duplicate **capture** suspected |
| **First 5 minutes** | Engineering: handler errors causing retries? |
| **Diagnostics** | `StripeWebhookEvent` idempotency; L27 behavior |
| **Allowed actions** | Fix forward deploy; **no** secret rotation unless compromised |
| **Forbidden actions** | Deleting webhook rows |
| **Escalation** | Engineering lead + finance |
| **L30 handoff** | Payment pending investigation |
| **Evidence** | Event id suffix distribution |
| **Closure** | Retry rate normal; no double-capture |

---

### 6. Suspicious fulfillment attempts

| Field | Guidance |
|-------|----------|
| **Detection** | Many failures to same MSISDN; operator pattern anomalies |
| **Severity** | P2–P1 |
| **First 5 minutes** | Classify fraud vs bad numbers |
| **Diagnostics** | Fulfillment intelligence classes; provider responses |
| **Allowed actions** | Kill switch per runbook **with comms** |
| **Forbidden actions** | Manual send outside system |
| **Escalation** | L28 provider owner |
| **L30 handoff** | Fulfillment delayed / more info |
| **Evidence** | Attempt counts (redacted MSISDN) |
| **Closure** | Pattern stopped or explained |

---

### 7. Provider abuse / top-up anomaly

| Field | Guidance |
|-------|----------|
| **Detection** | Unusual API error mix; credential stuffing against Reloadly (if logged) |
| **Severity** | P1 |
| **First 5 minutes** | Confirm no credential leak from our side |
| **Diagnostics** | OAuth token refresh errors; IP allowlists |
| **Allowed actions** | Rotate Reloadly secret **via vault** with dual control |
| **Forbidden actions** | Sharing client secret in Slack |
| **Escalation** | Provider TAM |
| **L30 handoff** | Provider outage / delay template if user-visible |
| **Evidence** | Provider ticket id |
| **Closure** | Provider confirms containment |

---

### 8. Ledger / reconciliation mismatch with fraud suspicion

| Field | Guidance |
|-------|----------|
| **Detection** | `missing_ledger`, recon REQUIRED + velocity fraud signals |
| **Severity** | P0 |
| **First 5 minutes** | Freeze high-risk manual recovery |
| **Diagnostics** | Finance + engineering joint |
| **Allowed actions** | Read-only recon exports |
| **Forbidden actions** | SQL “fixes”; silent refunds |
| **Escalation** | Executive incident |
| **L30 handoff** | Generic investigation only |
| **Evidence** | Hashed export manifest |
| **Closure** | Finance sign-off + engineering root cause |

---

### 9. Customer account takeover (ATO) suspicion

| Field | Guidance |
|-------|----------|
| **Detection** | New device + immediate high-value orders; password/OTP bypass reports |
| **Severity** | P1 |
| **First 5 minutes** | Do **not** tip attacker; preserve audit trail |
| **Diagnostics** | Session history, IP change, payment instrument change |
| **Allowed actions** | Account lock **per policy**; Stripe fraud tools |
| **Forbidden actions** | Sharing investigation details with reporter until verified |
| **Escalation** | Security + L30 lead |
| **L30 handoff** | Neutral templates; identity verification process |
| **Evidence** | Secure vault attachment |
| **Closure** | Account secured; customer notified per policy |

---

### 10. Manual recovery abuse risk

| Field | Guidance |
|-------|----------|
| **Detection** | Unusual volume of DLQ replays, staff API usage from new IP, social engineering to ops |
| **Severity** | P1 |
| **First 5 minutes** | Pause non-emergency manual actions |
| **Diagnostics** | Audit log for admin mutations |
| **Allowed actions** | Enforce MFA for staff; rotate admin tokens |
| **Forbidden actions** | “One-click” refund from support console without finance |
| **Escalation** | Security |
| **L30 handoff** | Escalate tickets to security queue |
| **Evidence** | Admin access review export |
| **Closure** | Controls reinforced; training |

---

## Revision

Update when PR #5 (dispute), PR #4 (ready), or fraud middleware changes ship.
