# L-84B — Operator UI checklist (future credential readiness)

**Gate / plan only.** Execute only under explicit future approval after L-84B merge — **not in this step**.

## Phase A — Confirm scope (before any env change)

- [ ] Vercel project selected: **`zora-walat-api-staging`** (exact name)
- [ ] **Not** `zora-walat-api` (production)
- [ ] Production frontend / `zorawalat.com` — no action planned
- [ ] Document timestamp and operator ID (no secrets)

## Phase B — Staging env (names only in evidence)

- [ ] Confirm or add `OPS_HEALTH_TOKEN` on **`zora-walat-api-staging`** — record **name only**
- [ ] Plan `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=true` for retry window only
- [ ] Plan `ZW_API_DEPLOYMENT_TIER=staging` on staging only
- [ ] Do **not** change production env
- [ ] Do **not** change Stripe / webhook / provider / DB env unless separately approved

## Phase C — Local credential (never in Ap786)

- [ ] Set `$env:ZW_OPS_HEALTH_TOKEN` locally — **do not print value**
- [ ] Confirm `NOT SET` → `SET` in evidence using status words only
- [ ] Do **not** commit token to repo

## Phase D — Pre-retry verification (future)

- [ ] Staging redeploy after env (future L-84 step)
- [ ] Exactly one authorized POST (future L-84 step)
- [ ] Exactly one log line capture (future L-84 step)
- [ ] Disable probe flag + redeploy after capture (future L-84 step)

## Phase E — Evidence filing (future)

- [ ] Ap786 artifacts redacted
- [ ] `secrets:scan` OK
- [ ] No runtime success claimed unless log line proven

## L-84B gate

Checklist filed for operator use. **No UI actions performed in this gate.**

---

*End.*
