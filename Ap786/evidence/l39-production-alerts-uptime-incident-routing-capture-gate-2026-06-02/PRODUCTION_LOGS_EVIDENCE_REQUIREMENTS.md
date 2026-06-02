# L-39 — Production logs evidence requirements

**Date:** 2026-06-02

---

## OBS-PROD-LOGS-API-001

| Field | Requirement |
|-------|-------------|
| **Scope** | Production **logs panel** for API project `zora-walat-api` |
| **Minimum visible** | Log stream UI, time range, structured fields (level, route, status enum) |
| **Forbidden in frame** | Raw webhook bodies, JWT, env values, full order/payment IDs |
| **Filename** | `OBS-PROD-LOGS-API-001-2026-06-02-redacted.png` |

---

## Acceptable log content

| Field | Rule |
|-------|------|
| `event_type` | Enum only |
| `outcome` | success / fail / denied |
| `correlation_id` | Truncated suffix ok |
| Customer PII | **None** |

---

## Does not prove

- Log retention compliance.
- Full money-path correlation without separate money-path artifact.

*L-39 gate filing does not prove production logs coverage.*
