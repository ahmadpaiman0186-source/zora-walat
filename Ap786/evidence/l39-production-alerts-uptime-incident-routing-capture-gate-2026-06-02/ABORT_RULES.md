# L-39 — Abort rules

**Date:** 2026-06-02
**Gate:** CORE10-L39-CAPTURE-GATE-001

---

Stop immediately and **do not ingest** if:

| ID | Trigger |
|----|---------|
| A1 | Screenshot contains secrets, tokens, env, passwords, webhook secrets, private keys |
| A2 | Staging/sandbox labeled or filed as production proof |
| A3 | Dashboard not tied to production `zora-walat-api` / `zorawalat.com` |
| A4 | Capture requires production deploy, probe, login, token refresh, env edit beyond read-only operator capture |
| A5 | User/customer/payment PII or full IDs exposed |
| A6 | Agent browser navigation or Vercel/Stripe/Reloadly API calls proposed |
| A7 | Fabricated, placeholder, or L-38 deployment PNG reused as alert/uptime/incident proof |
| A8 | Live rollback/restore executed without separate authorization |
| A9 | Text claims production-ready, real-money-ready, pilot-ready, or global-market-ready |

---

*Abort rules protect integrity; gate filing does not execute capture.*
