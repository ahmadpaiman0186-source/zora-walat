# L-84E — Vercel UI staging-only procedure

**Future operator procedure — not executed in L-84E gate.**

## Target (exact)

| Field | Value |
|-------|--------|
| Vercel project | **`zora-walat-api-staging`** |
| Forbidden projects | `zora-walat-api`, `zorawalat.com`, production frontend |

## Allowed env change (future)

| Variable | Action |
|----------|--------|
| `OPS_HEALTH_TOKEN` | **Add or update** on **`zora-walat-api-staging` only** |

## Forbidden env changes

| Target / var | Rule |
|--------------|------|
| `zora-walat-api` (production) | **Do not touch** |
| Unrelated staging vars | **Do not modify** unless separately approved |
| Stripe / webhook / provider / DB secrets | **Do not change** in this procedure |
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | Leave **`false`** until separate L-84 retry approval |

## UI steps (operator checklist)

1. Open Vercel dashboard → project **`zora-walat-api-staging`** (verify name exactly).
2. Settings → Environment Variables.
3. Add **`OPS_HEALTH_TOKEN`** to staging project primary slot (Production label on staging project).
4. Paste generated token **once** in UI value field — **do not screenshot value**.
5. Save. Confirm name appears in list as **Encrypted** — record **name only** in future evidence.
6. Confirm production project env list **unchanged**.

## L-84E boundary

**No Vercel action in this gate.**

---

*End.*
