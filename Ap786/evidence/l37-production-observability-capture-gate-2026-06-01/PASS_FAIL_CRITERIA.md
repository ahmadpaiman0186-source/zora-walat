# L-37 — Pass / fail criteria

**Date:** 2026-06-01
**Gate:** CORE10-L37-CAPTURE-GATE-001
**Aligns with:** [L-36A global proof standard](../../ZORA_WALAT_L36A_CURSOR_GLOBAL_PROOF_STANDARD_RULES_2026_06_01.md)

---

## Verdict definitions

| Verdict | Condition |
|---------|-----------|
| **PASS_WITH_REAL_PROOF** | Production screenshots and/or logs/APM/alert/uptime evidence **actually filed** under `screenshots-redacted/` (or approved evidence paths); redaction verified; production scope confirmed; money-path triage/alert/restore **demonstrated** in artifacts |
| **PARTIAL** | Some production evidence exists (e.g. dashboards only) but critical categories remain missing (APM, alerts, synthetics, SRE sign-off, money-path panels) |
| **PENDING_EVIDENCE** | No screenshots, logs, APM, or alerts filed — **current state** after L-36B |
| **NO-GO** | Production observability cannot detect, triage, alert, or restore money-path failures from filed evidence; or redaction/scope violation |

---

## Row-level criteria

| Row state | Meaning |
|-----------|---------|
| **ROW_PASS** | Artifact filed; redaction OK; production scope OK |
| **ROW_PARTIAL** | Staging or CI-only artifact — engineering reference **not** prod PROVEN |
| **ROW_FAIL** | Missing, wrong scope, or redaction violation |

---

## Program-level (future capture session)

| Program verdict | Requirement |
|-----------------|-------------|
| **PROGRAM_PASS** | All §2 categories in [CAPTURE_GATE.md](./CAPTURE_GATE.md) at **ROW_PASS**; `OBS-SIGN-SRE-001` signed |
| **PROGRAM_FAIL** | Any critical **ROW_FAIL** or secret leak |

---

## L-37 gate session (this filing)

| Field | Value |
|-------|-------|
| **CORE10-L37-VERDICT-001** | **L37_CAPTURE_GATE_FILED_NOT_PROOF** |
| **PASS_WITH_REAL_PROOF** | **Not eligible** — zero artifacts filed |
| **PENDING_EVIDENCE** | **true** (inherits L-36B zero-ingest state) |

---

*Pass criteria document what proof requires; meeting criteria requires future operator capture.*
