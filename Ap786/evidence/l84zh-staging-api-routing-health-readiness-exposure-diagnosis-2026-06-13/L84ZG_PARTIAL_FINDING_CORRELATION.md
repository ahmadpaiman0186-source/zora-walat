# L-84ZH — L-84ZG PARTIAL finding correlation

**L-84ZG probe UTC:** 2026-06-14T00:30:26Z  
**L-84ZG verdict:** `CORE10-L84ZG-VERDICT-001` — **PARTIAL**

## Correlation table

| L-84ZG observation | L-84ZH diagnosis |
|--------------------|------------------|
| Host reachable, TLS OK | Confirms deployment live; not a DNS/TLS blocker |
| No 5xx / crash | Function-limit fix did not cause crash on probed paths |
| `GET /` → 200 Next.js HTML | Root Directory `./` + Next.js framework — **frontend owns `/`** |
| `/health`, `/ready`, `/api/health`, `/api/ready` → 404 HTML | **No root rewrite/bridge** to `server/api/index.mjs` |
| `/api/webhooks/stripe` → 405 JSON | Root `api/webhooks/stripe.mjs` **is exposed** — proves API functions can run on this host |
| PARTIAL verdict | **Correct** — partial API surface only; readiness/liveness JSON not exposed |

## Why PARTIAL was correct (not BLOCKED)

| BLOCKED criterion | L-84ZG |
|-------------------|--------|
| DNS/TLS failure | **NO** |
| Unreachable | **NO** |
| All API routes fail | **NO** — webhook path returned API JSON |
| 5xx / function crash | **NO** |

| PASS criterion | L-84ZG |
|----------------|--------|
| Deterministic API JSON on health/ready | **NO** |

→ **PARTIAL** is the conservative accurate verdict.

## L-84ZF plan vs staging reality

[L-84ZF](../l84zf-read-only-runtime-http-proof-readiness-gate-2026-06-13/L84ZF_READ_ONLY_RUNTIME_HTTP_PROOF_READINESS_GATE.md) assumed `server/api/index.mjs` route surface on staging. L-84ZG + L-84ZH prove that assumption **does not hold** under current Root Directory `./` deployment.

---

*End.*
