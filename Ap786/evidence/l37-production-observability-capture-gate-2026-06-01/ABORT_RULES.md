# L-37 — Abort rules (capture sessions)

**Date:** 2026-06-01
**Gate:** CORE10-L37-CAPTURE-GATE-001

---

Stop immediately and **do not ingest** evidence if any rule below triggers.

| ID | Abort trigger | Action |
|----|---------------|--------|
| A1 | Screenshot or log contains secrets, tokens, env values, or passwords | **Abort** — delete unsafe copy from staging area; file BLOCKED note |
| A2 | Evidence is staging/sandbox but labeled or filed as production proof | **Abort** — reject ingest |
| A3 | Dashboard not clearly tied to production project/domain (see [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md) §2) | **Abort** — reject ingest |
| A4 | Capture session would require production deploy, probe, login, token refresh, or env edit beyond read-only operator screenshot | **Abort** — separate authorization required |
| A5 | User/customer/payment data exposed (PII, full payment/provider IDs) | **Abort** — redact and recapture |
| A6 | Agent proposes browser navigation, Vercel/Stripe/Reloadly API calls, or Runtime Doctor `--apply` | **Abort** session |
| A7 | Fabricated, placeholder, or reused staging/frontend-QA PNG presented as production | **Abort** — reject ingest |
| A8 | Evidence PR modifies app/server/frontend code | **Abort** — Ap786 evidence only |
| A9 | Session claims production-ready, real-money-ready, pilot-ready, or market-ready | **Abort** — revert claim text |

---

## Post-abort filing

1. Record abort ID and trigger in session evidence (Ap786 only).
2. Do **not** commit unredacted artifacts.
3. Verdict remains **PENDING_EVIDENCE** or **NO-GO** until safe recapture.

---

*Abort rules protect evidence integrity; they do not constitute operational proof.*
