# L-39 — Alert routing evidence requirements

**Date:** 2026-06-02

---

## OBS-ALERT-ROUTING-001

| Field | Requirement |
|-------|-------------|
| **Scope** | Production alert **policy** and **routing** (who/what fires, severity, route target) |
| **Host/project** | Must reference production monitoring tied to `zora-walat-api` and/or `zorawalat.com` — not staging-only |
| **Minimum visible** | Alert rule name, condition summary, enabled state, route to channel/team |
| **Filename** | `OBS-ALERT-ROUTING-001-2026-06-02-redacted.png` |

## OBS-ALERT-CHANNEL-001

| Field | Requirement |
|-------|-------------|
| **Scope** | Alert **destination/channel** (PagerDuty, Slack, email, etc.) — **redacted** |
| **Minimum visible** | Channel type + routing path; **no** webhook URLs, tokens, or private emails |
| **Filename** | `OBS-ALERT-CHANNEL-001-2026-06-02-redacted.png` |

---

## Pass when (future intake)

- Both PNGs filed; redaction per [REDACTION_POLICY.md](./REDACTION_POLICY.md); production scope confirmed.
- Optional: one **fired drill** ticket reference (redacted) in companion MD — not required at L-39 gate filing.

---

## Does not prove

- That alerts fire correctly under load.
- That on-call acknowledges within SLO.

*Requirements only — L-39 gate filing does not prove alerting.*
