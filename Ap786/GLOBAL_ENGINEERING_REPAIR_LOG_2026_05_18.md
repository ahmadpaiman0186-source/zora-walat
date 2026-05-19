# Global engineering repair log — 2026-05-18

Safe changes only. No payment/ledger/refund behavior changes.

---

## REP-001 — Checkout session log redaction

| Field | Value |
|-------|--------|
| **File** | `server/src/controllers/paymentController.js` |
| **Why** | `console.log('STRIPE_SESSION_CREATED', session.id)` and pino `sessionId` logged full Stripe Checkout session ids (correlation surface / log leakage). |
| **Risk** | **Low** — observability only |
| **Runtime behavior** | Log field names/shape change (`sessionId` → `sessionIdSuffix`); audit DB still stores full id in controlled payload (existing). |
| **Tests** | No new test; pattern matches existing `safeSuffix` usage elsewhere in file |
| **Rollback** | Revert single hunk in `paymentController.js` |

---

## REP-002 — Ap786 global audit pack (this commit)

| Field | Value |
|-------|--------|
| **Files** | `Ap786/GLOBAL_ENGINEERING_*.md`, `AP786_EVIDENCE_INDEX.txt` update |
| **Why** | Required audit deliverables; honest PASS/PARTIAL labeling |
| **Risk** | **None** (docs only) |
| **Rollback** | Revert doc commit |

---

## Not changed (explicit)

- Ledger posting logic  
- Webhook verification crypto  
- Refund execution tools (behavior unchanged)  
- `.env` / secrets  
- Database schema  
