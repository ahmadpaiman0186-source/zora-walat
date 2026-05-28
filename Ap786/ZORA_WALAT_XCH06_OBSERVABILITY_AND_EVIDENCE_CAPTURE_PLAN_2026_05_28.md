# XCH-06 Observability And Evidence Capture Plan

**Date:** 2026-05-28
**Status:** **PLAN ONLY / NO PRODUCTION EVIDENCE**

---

## 1. Simulation event markers (future)

Proposed prefix: `ZW_SANDBOX_SIMULATION_OBSERVABILITY`

| Event | Marker |
|-------|--------|
| Sim session started | `sim_session_started` |
| Sim quote priced | `sim_quote_priced` |
| Sim ledger marker | `sim_ledger_event` |
| Sim provider event | `sim_provider_event` |
| Sim compliance gate | `sim_compliance_gate` |
| Sim session ended | `sim_session_ended` |

**Not deployed.**

---

## 2. Fake quote evidence

| Capture | Format |
|---------|--------|
| Request/response JSON (redacted) | Ap786 evidence folder |
| UI screenshot with `SIMULATION` banner | PNG |
| Expiry rejection proof | Log excerpt |

Evidence IDs (proposed): `XCH06-SIM-Q-001` … — **PENDING CAPTURE**.

---

## 3. Fake provider evidence

| Capture | Contents |
|---------|----------|
| Stub adapter config | Fixture catalog snapshot |
| Simulated webhook payload | JSON (synthetic) |
| Failure injection proof | Scenario SIM-04/07 log |

---

## 4. Fake ledger evidence

| Capture | Contents |
|---------|----------|
| In-memory balance check | Log showing debits = credits |
| No DB write proof | DB audit query (empty) — future |

---

## 5. Fake compliance evidence

| Capture | Contents |
|---------|----------|
| KYC hold screenshot | SIM-05 |
| Sanctions block log | SIM-06 |

**Not compliance approval** — engineering test artifacts only.

---

## 6. Screenshot / evidence requirements

| Requirement | Rule |
|-------------|------|
| Visible simulation label | **REQUIRED** in all UI captures |
| No real PII | Synthetic personas only |
| Redact secrets | Standard Ap786 rules |
| Filename convention | `XCH06-SIM-{SCENARIO}-{SEQ}.png` |

Target folder: `Ap786/evidence/xch06-sandbox-simulation-2026-05-28/` — **NOT CREATED** (optional future).

---

## 7. Audit evidence requirements

Each sim run (future) should record:

- `simRunId`, `scenarioId`, `operatorId`, `startedAt`, `endedAt`, `outcome`
- Hash of fixture catalog version
- Link to captured PNGs/logs

---

## 8. Production evidence boundary

| Claim | Status |
|-------|--------|
| Evidence plan specified | **YES** |
| Production evidence | **NOT CLAIMED** |
| Simulation proves production readiness | **FORBIDDEN CLAIM** |

---

*XCH-06 evidence plan — no captures filed*
