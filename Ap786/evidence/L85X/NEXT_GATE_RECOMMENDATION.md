# L-85X — Next gate recommendation

**No mutation in L-85X. No L-85M retry until route exposure is fixed and separately verified.**

---

## Recommended next gate: L-85Y (or operator-named) — route mapping fix **plan** only

Choose **one** authorized remediation path (design evidence only until operator approves implementation):

### Option A — Vercel Root Directory correction (preferred structural fix)

- Set project **`zora-walat-api-staging`** Root Directory to **`server`** in Vercel UI.
- Ensure git production deployments build `server/vercel.json` catch-all.
- **Separate gate:** structural unauthenticated probe (401 `token_missing`) — no auth, no env mutation.

### Option B — Root bridge rewrite (minimal surface)

- Add root `vercel.json` rewrite: `/ops/db-readonly-proof` → serverless handler.
- Add root `api/` bridge mirroring `server/api/index.mjs` prebootstrap block **or** proxy pattern.
- Higher maintenance risk; must not expose secrets.

### Option C — Repeat `server/` CLI deploy only (operational, not durable)

- `npm run deploy:staging` from `server/` after each git `main` advance.
- Does not fix Root Directory `.` — git deploy may overwrite (L-85O pattern).

## Sequence after route exposure proven

1. **L-85Y** — route mapping fix plan + optional authorized implementation gate.
2. **Structural verify** — unauthenticated `GET /ops/db-readonly-proof` → **401** JSON (not 404).
3. **L-85M retry** — separately authorized authenticated runtime DB proof.

## Explicitly not recommended now

- Immediate L-85M retry (will likely 404 again).
- Env changes (already done in L-85V).
- Authenticated proof before structural 401 confirmed.

---

*End.*
