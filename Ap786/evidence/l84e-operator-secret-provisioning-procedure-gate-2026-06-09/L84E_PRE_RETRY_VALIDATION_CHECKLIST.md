# L-84E — Pre-retry validation checklist

**Before separate L-84 retry approval — not satisfied in L-84E gate.**

## Credential provisioning

- [ ] Staging project exactly **`zora-walat-api-staging`**
- [ ] Staging `OPS_HEALTH_TOKEN` **PRESENT** (name only in evidence)
- [ ] Local `ZW_OPS_HEALTH_TOKEN` **SET (value hidden)**
- [ ] Token values **not** in repo/chat/evidence

## Env gates (staging only)

- [ ] `ZW_API_DEPLOYMENT_TIER=staging`
- [ ] `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false` until retry window approved
- [ ] Production env **untouched**

## Deploy

- [ ] Staging redeploy **Ready** after token provision
- [ ] No production redeploy

## Safety

- [ ] No Stripe / webhook / payment / provider / DB action in provisioning
- [ ] No staging HTTP/POST during provisioning evidence
- [ ] Explicit **L-84 retry approval phrase** issued separately

## L-84E status

All items **unchecked** — procedure gate only; provisioning **not executed**.

---

*End.*
