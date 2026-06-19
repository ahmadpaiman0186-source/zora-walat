# L-85M-R1 — Webhook runtime surface reconciliation

---

## Question checklist

| Question | Answer |
|----------|--------|
| Present in tracked source? | **YES** |
| Routed through **root** entrypoint? | **YES** — rewrite + `api/webhooks/stripe.mjs` |
| Routed through **server/** entrypoint? | **YES** — `server/api/index.mjs` pre-bootstrap POST |
| Isolated from DB proof route concerns? | **PARTIAL** — separate handlers; **same** deploy-target split |
| Exposed via root bridge? | **YES** |
| Exposed via server handler? | **YES** |
| Same route exposure mismatch as DB proof? | **NO for webhook** — root bridge exists; **YES for `/ops/*`** |

## Tracked webhook chain (root deploy)

```text
POST /webhooks/stripe
  → vercel.json rewrite → /api/webhooks/stripe
  → api/webhooks/stripe.mjs
  → handleSlimStripeWebhookPost (signature before bootstrap)
  → getExpressHandler() → Express /webhooks/stripe routes
```

## Tracked webhook chain (server deploy)

```text
POST /webhooks/stripe
  → server/api/index.mjs pre-bootstrap block
  → handleSlimStripeWebhookPost → getHandler() → Express
```

## Historical evidence (not re-run in L-85M-R1)

Prior gates (e.g. STR08, L-85Q) recorded staging webhook reachability with invalid-signature fail-closed behavior on **`zora-walat-api-staging`**. This gate **does not re-prove** live webhook behavior.

## Relation to L-86E-0

Dispute contract (Option C defer) is **orthogonal** to route exposure: webhook **path is mapped** on root deploy; DB proof **path is not**. L-86E-1 remains deferred until proof chain stabilizes.

## Runtime proof status

| Proof type | Status |
|------------|--------|
| Tracked source + root mapping | **Present** |
| Live webhook money-path proof (L-86E R6) | **NOT AUTHORIZED** in this gate |
| Staging dispute contract proof | **NOT PROVEN** |

---

*End.*
