# L-82 — Vercel staging flag enablement evidence

## Command (redacted output)

```
cd server
vercel link --project zora-walat-api-staging --yes
vercel env add SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED production --value true --yes
```

## CLI result

```
Added Environment Variable SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED to Project zora-walat-api-staging
```

## Post-add verification

```
vercel env list production
 SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED     Encrypted           Production
```

## Flag semantics

| Property | Value |
|----------|-------|
| Name | `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` |
| Value set | `true` (boolean string; non-secret) |
| Scope | **Staging project only** |
| Vercel env target | Production (staging project's primary deployment slot) |
| Live enforcement | **NOT enabled** — diagnostics-only code path |

No secret values recorded in this artifact. Vercel displays value as Encrypted in dashboard/CLI listing.

---

*End.*
