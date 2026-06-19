# L-85M-R1 — Route exposure matrix

**Deploy assumption:** staging git deploy = **root** (L-85O/L-85W/L-85X). CLI `server/` deploy = **server** surface.

| Route | Source file | Registered in app | Entrypoint path | Vercel mapping (root) | Runtime proof status | Risk | Next required gate |
|-------|-------------|-------------------|-----------------|----------------------|----------------------|------|-------------------|
| `GET /health` | `health.routes.js`, slim liveness | **YES** | Root: `api/health-ready.mjs`; Server: `server/api/index.mjs` | **YES** — rewrite | **Structural OK** (L-85M 200) | LOW | — |
| `GET /ready` | `health.routes.js`, `slimReadyHandler` | **YES** | Root bridge; Server index | **YES** — rewrite | **Not re-proven** | MEDIUM | R4 optional |
| `GET /ops/health` | `ops.routes.js` | **YES** | Server index → Express only | **NO** | **404 on root** (L-85M) | MEDIUM | R2 then R4 |
| `GET /ops/db-readonly-proof` | `ops.routes.js`, pre-bootstrap handler | **YES** | Server index pre-bootstrap + Express | **NO** | **404 on root** — **L-85M BLOCKED** | **HIGH** | **R2 → R4 → R5** |
| `GET /api/admin/ops/db-readonly-proof` | Same router (admin mount) | **YES** | Server index | **NO** | **404 on root** (L-85M) | **HIGH** | R2 → R4 → R5 |
| `POST /webhooks/stripe` | `stripeWebhook.routes.js`, slim handler | **YES** | Root: `api/webhooks/stripe.mjs`; Server index | **YES** — rewrite | **Historically reachable**; not re-proven | **HIGH** (money-path) | R6 (separate auth) |
| Express catch-all API | `server/src/app.js` | **YES** | Server index `getHandler()` only | **NO** (root) | **Not exposed** on root deploy | HIGH | R2 or Root Dir fix |

---

*End.*
