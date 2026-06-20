# L-85M-R5-R1 — Auth contract review

**Gate UTC:** 2026-06-20  
**Source:** tracked source only

---

| Field | Contract |
|-------|----------|
| Primary header | `Authorization: Bearer <OPS_HEALTH_TOKEN>` |
| Alternate | `X-ZW-Ops-Token: <token>` |
| Not used | `x-ops-health-token` |
| Pre-bootstrap | `server/lib/prebootstrapDbReadonlyProofGuard.mjs` |
| Proof service | `server/src/services/dbReadonlyProofService.js` |
| Expected role | `zora_walat_readonly_audit` |

---

*End.*
