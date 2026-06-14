# L-84ZF — Read-only runtime / HTTP proof readiness gate

**GLOBAL INTERNATIONAL REAL-PROOF STANDARD — Zora-Walat**

NO L WITHOUT REAL PROOF · NO FAKE PROOF · NO MARKETING CLAIM WITHOUT MARKET PROOF · NO MONEY CLAIM WITHOUT MONEY PROOF · NO GLOBAL CLAIM WITHOUT GLOBAL ENGINEERING EVIDENCE · REAL APP FOR GLOBAL REVENUE, NOT A DEMO

**Date:** 2026-06-13
**Verdict:** `CORE10-L84ZF-VERDICT-PREP: READ_ONLY_RUNTIME_HTTP_PROOF_READINESS_GATE_PREPARED_NO_RUNTIME_PROOF_CLAIMED_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## 1. Purpose

Prepare the **next real-proof gate** for read-only runtime / HTTP verification after L-84ZB Vercel serverless function-limit resolution and L-84ZE PR reconciliation baseline. **L-84ZF is plan-only.** HTTP execution requires a **separate explicitly authorized execution gate** (e.g. L-84ZG-class).

## 2. Preconditions (must be true before any HTTP execution gate)

| # | Precondition | Current status |
|---|--------------|----------------|
| 1 | L-84ZB merged on `main` | **YES** — PR #234 |
| 2 | L-84ZE / PR reconciliation baseline clean | **YES** — PR #238 |
| 3 | Staging project locked | **`zora-walat-api-staging`** only |
| 4 | Post-fix staging redeploy completed | **NOT CLAIMED** — separate gate |
| 5 | Operator authorization phrase for HTTP | **NOT ISSUED** in L-84ZF |
| 6 | No secrets in chat/evidence | **Required** |
| 7 | L-84P retry | **NOT AUTHORIZED** unless separately approved |

## 3. Allowed target (execution gate only)

| Field | Value |
|-------|-------|
| Host | **`zora-walat-api-staging.vercel.app`** |
| Production API | **FORBIDDEN** in this track |
| Real-money checkout | **FORBIDDEN** |
| Stripe Dashboard | **FORBIDDEN** |
| Provider API calls | **FORBIDDEN** |

## 4. Safe endpoint plan (read-only / fail-closed)

Derived from `server/api/index.mjs` slim paths and public probes. **Default method: GET.** POST only where endpoint is expected to **fail closed** without credentials, signature, or payment intent.

| ID | Method | Path | Purpose | Mutating? | Expected without auth/secret |
|----|--------|------|---------|-----------|----------------------------|
| H1 | GET | `/health` | Liveness | **NO** | **200** `{ status: ok }` |
| H2 | GET | `/api/health` | Liveness alias | **NO** | **200** |
| H3 | GET | `/` | Root liveness | **NO** | **200** |
| H4 | GET | `/ready` | Readiness (DB core) | **NO** | **200** or **503** (no secrets in body) |
| H5 | GET | `/api/ready` | Readiness alias | **NO** | **200** or **503** |
| H6 | GET | `/api/index` | Root API route probe | **NO** | **200** `{ status: ok }` |
| H7 | HEAD | `/api/index` | Root API HEAD probe | **NO** | **200** empty body |
| H8 | GET | `/success` | Checkout return page | **NO** | **200** HTML (no session id leak) |
| H9 | GET | `/cancel` | Checkout cancel page | **NO** | **200** HTML |
| A1 | POST | `/api/auth/login` | Auth route existence | **NO** (no valid body) | **400** fail-closed |
| A2 | POST | `/api/auth/register` | Auth route existence | **NO** | **415/400** fail-closed |
| A3 | POST | `/api/auth/request-otp` | Auth route existence | **NO** | **415/400** fail-closed |
| W1 | POST | `/webhooks/stripe` | Webhook signature gate | **NO** (no valid sig) | **400** fail-closed |
| C1 | POST | `/api/create-checkout-session` | Checkout guard | **NO** (no bearer) | **401** fail-closed |
| O1 | GET | `/ops/health` | Ops infra (L-84P class) | **NO** | **503** unauthenticated (prelaunch) — **L-84P NOT AUTHORIZED** |

**Forbidden in read-only track:**

- POST with valid Stripe webhook signature
- POST with valid auth credentials
- POST that creates checkout sessions, charges, or provider orders
- Any production host
- Any request body containing secrets

## 5. Allowed HTTP methods

| Method | Default | POST allowed when |
|--------|---------|-------------------|
| **GET** | **YES** — primary for probes | — |
| **HEAD** | **YES** — H7 only | — |
| **POST** | **NO** by default | Endpoint explicitly non-mutating and **expected to fail closed** without credentials/signature/payment (A1–A3, W1, C1) |

## 6. Proof artifacts (required in later execution gate)

Each matrix row must produce:

| Artifact | Requirement |
|----------|-------------|
| Endpoint matrix row ID | H1…C1 |
| HTTP status code | Record exact code |
| Response body | **Redacted** — no secrets, tokens, DB URLs, PII |
| Timestamp (UTC) | ISO-8601 |
| Deployment URL / source | Staging host + path only |
| No-secret confirmation | **YES** — operator attestation |
| No-payment confirmation | **YES** — no checkout/charge created |
| No-provider-call confirmation | **YES** — no Reloadly/Stripe API outbound from proof calls |

Use [HTTP_PROOF_MATRIX_TEMPLATE.md](./HTTP_PROOF_MATRIX_TEMPLATE.md).

## 7. Fail-closed criteria (abort execution gate)

| Condition | Action |
|-----------|--------|
| Any secret in response body or logs | **ABORT** — rotate/review; do not file raw body |
| Unexpected **2xx** on C1 with checkout URL | **ABORT** — possible auth bypass |
| Unexpected **2xx** on W1 without controlled test | **ABORT** |
| Production host hit | **ABORT** |
| Response contains `sk_live`, `whsec_`, `postgres://` | **ABORT** |
| Deployment still shows Hobby function-limit error | **ABORT** — redeploy gate not complete |
| Operator uncertainty on target host | **ABORT** |

## 8. Rollback / safe-fail position

| Situation | Safe position |
|-----------|---------------|
| HTTP gate aborted | **No proof filed** — baseline unchanged |
| Partial matrix only | **FAIL** — do not claim partial runtime proof |
| Accidental mutating call | **STOP** — document abort only; no retry without re-auth |
| L-84ZF prep | **Plan remains valid** — execution not authorized |

## 9. Relationship to L-84P

[L-84P](../l84p-authenticated-staging-http-runtime-proof-2026-06-10/L84P_ENDPOINT_DISCOVERY_RECORD.md) covers **authenticated** `GET /ops/health`. **L-84P retry NOT AUTHORIZED** in L-84ZF. Unauthenticated O1 row may appear in a future read-only matrix; authenticated L-84P remains a **separate approval**.

## 10. Agent boundary (L-84ZF prep)

| Action | Performed |
|--------|-----------|
| Ap786 plan authoring | **YES** |
| HTTP / curl / browser | **NO** |
| Vercel redeploy / env | **NO** |
| Stripe / provider | **NO** |

---

*End.*
