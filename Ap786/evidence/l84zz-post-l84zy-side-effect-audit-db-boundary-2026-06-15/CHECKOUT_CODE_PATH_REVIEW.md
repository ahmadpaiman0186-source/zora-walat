# L-84ZZ — Checkout code path review (C1–C4)

**Source:** read-only review on main @ `33f9d56`  
**Files:** `api/create-checkout-session.mjs`, `server/handlers/slimCreateCheckoutHandler.mjs`

---

## Root bridge (`api/create-checkout-session.mjs`)

| Step | Lines | C1/C3/C4 (no Bearer) | C2 (invalid Bearer) |
|------|-------|----------------------|---------------------|
| POST only | L36–40 | — | — |
| `hasBearer` check | L42–46 | **false** | **true** (non-empty Bearer prefix) |
| Slim handler import/call | L48–59 | **Not reached** | **Reached** |
| No Bearer + no dev header | L62–70 | **401 JSON** `auth_required` | N/A |
| Express fallback (dev header) | L73–79 | Not used in L-84ZY probes | Not used |

**C1/C3/C4:** Response returned at **L67–70** without loading checkout orchestration, Stripe, or Prisma payment paths.

---

## Slim handler (`handleSlimCreateCheckoutPost`) — C2 path only

| Step | Lines | Side effect before 401? |
|------|-------|-------------------------|
| Lockdown guards | L209–225 | No — not reached if auth fails first |
| Content-Type JSON | L227–241 | C2: passes |
| Missing bearer in handler | L243–255 | C2: has token |
| `verifyAccessToken` / user load | L257–308 | Invalid token → **catch L309** → **401** |
| `createCheckoutSession` | **L413–417** | **Not reached** on invalid JWT |
| Stripe session / DB checkout row | via `createCheckoutSession` | **Not reached** |
| Provider fulfillment | N/A at checkout create | **Not reached** |
| Payment audit writes | N/A pre-orchestration | **Not reached** |

---

## Probe ↔ code mapping

| Probe | Expected runtime (L-84ZY) | Code exit point |
|-------|---------------------------|-----------------|
| **C1** no Bearer `{}` | **401** | Bridge L67–70 |
| **C2** invalid Bearer `{}` | **401** | Handler L309–318 (`auth_invalid`) |
| **C3** no Bearer bad JSON | **401** | Bridge L67–70 (body not parsed at bridge) |
| **C4** no Bearer `text/plain` | **401** | Bridge L67–70 |

---

*End.*
