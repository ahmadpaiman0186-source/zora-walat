# L-85M-R5-R2M — READ_ONLY_DATABASE_URL metadata

**Gate UTC:** 2026-06-20  
**Target project:** **`zora-walat-api-staging`**

---

| Field | Value |
|-------|--------|
| Name | `READ_ONLY_DATABASE_URL` |
| Present | **YES** |
| Vercel list scope queried | `production` |
| `target` | `["production"]` |
| Type | `sensitive` |
| `createdAt` (ms, CLI metadata) | `1781738516113` |
| `updatedAt` (ms, CLI metadata) | `1781738516113` |
| Value accessed | **NO** |
| Length metadata | **LENGTH_NOT_AVAILABLE_METADATA_ONLY** |
| Runtime DB proof | **NOT CLAIMED** |

## R5-R1 relevance

Name **present** — R5-R1 **401** (not **503** `readonly_url_missing`) is consistent with **auth-layer rejection before** readonly URL gate evaluation, not with missing readonly URL **name** on project.

---

*End.*
