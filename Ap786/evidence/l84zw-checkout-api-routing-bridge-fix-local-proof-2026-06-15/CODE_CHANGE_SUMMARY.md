# L-84ZW — Code change summary

**Verdict:** `CORE10-L84ZW-VERDICT-001`

## Runtime / config files

| File | Action | Summary |
|------|--------|---------|
| `api/create-checkout-session.mjs` | **Added** | Root bridge: POST-only; Bearer → `handleSlimCreateCheckoutPost`; no Bearer (no dev header) → **401** JSON; dev `X-ZW-Dev-Checkout` → Express fallback (parity with `server/api/index.mjs`) |
| `vercel.json` | **Modified** | Add rewrite `/create-checkout-session` → `/api/create-checkout-session` |
| `server/test/rootCreateCheckoutBridge.test.js` | **Added** | Local bridge: 401 no Bearer, 415 non-JSON with Bearer, mocked success |
| `server/test/rootVercelWebhookBridge.test.js` | **Modified** | Update expected rewrites array |

## Unchanged (explicit)

| Area | Status |
|------|--------|
| `slimCreateCheckoutHandler.mjs` business logic | **Unchanged** |
| Payment/provider orchestration | **Unchanged** |
| Stripe env / Vercel env | **Unchanged** |
| `api/webhooks/stripe.mjs` | **Unchanged** |
| `api/health-ready.mjs` | **Unchanged** |

## Rewrite surface (after merge + future redeploy)

| Public path | Bridge destination |
|-------------|-------------------|
| `/api/create-checkout-session` | `api/create-checkout-session.mjs` (Vercel file route) |
| `/create-checkout-session` | `/api/create-checkout-session` (rewrite) |

## Expected post-redeploy behavior (hypothesis — not proven in L-84ZW)

| Probe | Expected (after redeploy) |
|-------|---------------------------|
| C1 no Bearer `{}` | **401** JSON `auth_required` |
| C2 invalid Bearer | **401** JSON |
| C3 malformed body no Bearer | **401** JSON |
| C4 non-JSON no Bearer | **401** JSON |

**L-84ZW does not claim these outcomes** — requires post-merge redeploy + L-84ZV-style re-probe gate.

---

*End.*
