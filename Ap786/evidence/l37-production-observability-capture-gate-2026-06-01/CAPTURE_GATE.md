# L-37 — Production observability capture gate

**Date:** 2026-06-01
**Gate ID:** CORE10-L37-CAPTURE-GATE-001
**Status:** **FILED** — capture rules only; **not** operational proof

---

## 1. Gate purpose

Strict **read-only** capture gate filed after [L-36B](../../ZORA_WALAT_L36B_PRODUCTION_DASHBOARD_SCREENSHOT_REINTAKE_EVIDENCE_2026_06_01.md) confirmed **zero** operator-filed production dashboard screenshots. This gate defines **what** must be captured, **how** it must be redacted, and **when** capture may pass or must abort — without executing production probes, deploys, or agent browser navigation.

**Global proof standard:** International/global public launch requires **real production proof**, not documents alone.

---

## 2. Production observability evidence categories (required)

| # | Category | Minimum artifact | Production scope required |
|---|----------|------------------|---------------------------|
| 1 | Platform / deployment dashboard | Redacted PNG/PDF: project overview, deploy list, production alias | `zora-walat-api`, `zora-walat` / zorawalat.com |
| 2 | API deployment / health visibility | Redacted PNG: API prod deployment status, function/route health | Production API project only |
| 3 | Frontend deployment / availability | Redacted PNG: frontend prod deployment, domain, availability | Production frontend project only |
| 4 | Logs / error dashboard | Redacted PNG or JSONL sample: error rate, structured log panel | Production log scope; no raw secrets |
| 5 | APM / metrics dashboard | Redacted PNG: latency, 5xx, RED-style panels | Production APM scope |
| 6 | Uptime / synthetics | Redacted PNG: 7d synthetic or uptime history for prod hosts | `/`, `/api/health`, money-path routes as applicable |
| 7 | Alert policy / routing | Redacted PNG + ticket ref: alert fired, route to on-call | Production alert config evidence |
| 8 | Incident / on-call / rollback | Redacted MD or PNG: drill record, rollback steps, post-health | Production rollback **record** only (no live rollback without phrase) |
| 9 | Security / audit | Redacted PNG: auth failure enums, audit trail summary | No JWT/session/env panels |
| 10 | Money-path observability | Redacted PNG: webhook success/fail, unpaid gate, duplicate counters | Production money-path panels only |

**Staging / sandbox / frontend-QA artifacts do not satisfy any row above for production PROVEN.**

---

## 3. Intake folders (operator)

| Folder | Use |
|--------|-----|
| [screenshots-redacted/](./screenshots-redacted/) | Operator-filed `OBS-DASH-*-2026-06-01-redacted.png` |
| Future `logs-redacted/`, `apm-redacted/` | Optional subfolders per [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md) |

---

## 4. Gate outcomes (summary)

| Outcome | When |
|---------|------|
| `PASS_WITH_REAL_PROOF` | All critical categories filed, redaction verified, production scope confirmed |
| `PARTIAL` | Some production evidence filed; critical categories missing |
| `PENDING_EVIDENCE` | No screenshots/logs/APM/alerts filed (current state post L-36B) |
| `NO-GO` | Cannot detect/triage/alert/restore money-path failures from filed evidence |

See [PASS_FAIL_CRITERIA.md](./PASS_FAIL_CRITERIA.md) and [ABORT_RULES.md](./ABORT_RULES.md).

---

## 5. Cross-links

| Document | Role |
|----------|------|
| [L-33 manifest](../l33-production-observability-manifest-2026-05-31/EVIDENCE_MANIFEST.md) | Planning baseline |
| [L-36B re-intake](../../ZORA_WALAT_L36B_PRODUCTION_DASHBOARD_SCREENSHOT_REINTAKE_EVIDENCE_2026_06_01.md) | **0** screenshots ingested |
| [L-36A global proof rules](../../ZORA_WALAT_L36A_CURSOR_GLOBAL_PROOF_STANDARD_RULES_2026_06_01.md) | Real proof standard |

---

*This gate is not proof. Filing does not imply production observability PROVEN.*
