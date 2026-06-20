# L-85M-R4 — Target selection

**Gate UTC:** 2026-06-20

---

## Selected base URL

| Field | Value |
|-------|-------|
| Project | `zora-walat-api-staging` |
| Public host | `https://zora-walat-api-staging.vercel.app` |
| Primary path | `/ops/db-readonly-proof` |

## Selection rationale

- Prior Ap786 evidence (L-84P, L-85M-R3, STR02/STR08 packs) documents this **public** staging host.
- L-85M-R3 observed Vercel **`zora-walat-api-staging`** deployment success on merge commit carrying R2B route mapping.
- No private URLs, tokens, or deployment-preview secrets used.

## Not used

| Item | Reason |
|------|--------|
| Production `zora-walat-api` / `zorawalat.com` | Out of L-85M staging scope |
| Preview URLs with auth tokens | Gate boundary |
| `OPS_HEALTH_TOKEN` | Not authorized |

---

*End.*
