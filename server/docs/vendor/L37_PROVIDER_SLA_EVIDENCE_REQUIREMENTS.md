# L37 — Provider SLA evidence requirements

## Purpose

Define **what evidence** must exist **before** production use of a live fulfillment provider (Reloadly) and **how** to store it without leaking secrets. This is a **governance** document; it does not perform verification.

## Evidence required before production provider use

| Category | Required artifact | Notes |
|----------|-------------------|--------|
| **Account status** | Screenshot or PDF export from Reloadly dashboard (redacted) showing account type, region/mode alignment | Must show **production** vs sandbox clarity |
| **Commercial terms** | SLA or terms excerpt, support tier, or ticket confirming committed response/limitations | If no formal SLA, record **“best effort”** explicitly |
| **Technical readiness** | Output of `npm run reloadly:sandbox-readiness` (or successor) from a **staging** profile; production checklist from `PRODUCTION_MONEY_PATH_CHECKLIST.md` | **Values redacted** — presence only |
| **Operator mapping** | Table: internal `operatorKey` → Reloadly operator id for **each** production SKU | No live API keys in the table |
| **Rate limits / quotas** | Vendor documentation or account notice capturing limits relevant to peak RPS | Links + summary |
| **Incident / status** | Vendor status page subscription evidence, support portal access | Who can open P1 tickets |
| **Security** | MFA, API key rotation policy, IP allowlist if used | Align with `SECRETS_MANAGEMENT.md` |

## Account status proof

- Document **who** owns the Reloadly org, billing contact, and break-glass access.
- Record **environment separation**: sandbox credentials must not be deployable to production secrets store without deliberate promotion.

## Sandbox proof

- Completed golden-path rehearsal per `runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md` with **pass/fail table** filled.
- At least one **forced failure** drill outcome recorded (mock or sandbox) showing ops can locate the order and reconciliation path.

## Live approval proof

- Written approval (name, role, date) authorizing: production keys in secret store, `RELOADLY_SANDBOX=false`, `PHASE1_FULFILLMENT_OUTBOUND_ENABLED=true` (if used), and launch scope.
- Link or id of **change ticket** — no production mutation via this doc.

## Rate limits / quotas

- Capture **documented** limits (requests/min, concurrent, daily caps).
- Record **internal** safe targets (de-rated) for checkout concurrency and worker fan-out.

## Support escalation contact

- Primary support channel (portal/email), **hours**, expected initial response for Sev1/Sev2.
- Internal **escalation tree** (on-call / vendor liaison) referencing org chart, not personal phone numbers in public indexes.

## SLA terms capture

- Store **excerpts** with citation (URL, section, version date).
- If vendor offers credits for breach, capture **claim process** and evidence requirements.

## Incident response commitment

- Vendor’s published incident communication path vs what engineering needs (RCA timelines).
- Map to internal severity model (`PHASE1_INCIDENT_PLAYBOOK.md` / operations docs as applicable on branch).

## Refund / reversal workflow

- **Stripe-side** refunds/disputes: `PHASE1_REFUND_AND_DISPUTE.md`.
- **Provider-side** reversals: document whether Reloadly supports reversal, credit notes, or **manual** compensation — **do not assume** automatic clawback of airtime.

## Redaction rules

- **Never** store: client secrets, access tokens, full webhook signing secrets, full phone numbers, full payment instrument data.
- **OK:** last-four style references, order id **suffixes**, timestamp, outcome enum, redacted screenshots with sensitive rows blacked out.
- Evidence packs live under operator-controlled storage (e.g. `zora_walat_evidence/…`) with **no secrets** in filenames or body.

## Status model (per item)

| Status | Meaning |
|--------|---------|
| **PASS** | Evidence present, reviewed, not expired |
| **FAIL** | Missing or contradictory evidence |
| **NOT VERIFIED** | Not yet collected; **blocks** live promotion |
| **BLOCKED** | Dependency or vendor restriction prevents completion; escalate |

## Related

- [L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md](./L37_PRODUCTION_PROVIDER_PROOF_CHECKLIST.md)
- [L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md](./L37_VENDOR_SLA_PROVIDER_FALLBACK_STRATEGY.md)
- [../runbooks/RELOADLY_PRODUCTION_REHEARSAL.md](../runbooks/RELOADLY_PRODUCTION_REHEARSAL.md)
