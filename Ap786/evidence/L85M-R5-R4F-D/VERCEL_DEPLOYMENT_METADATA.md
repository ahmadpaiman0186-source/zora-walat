# L-85M-R5-R4F-D — Vercel deployment metadata

**Gate UTC:** 2026-06-21

---

## Access posture

| Field | Value |
|-------|--------|
| Metadata accessible | **YES** |
| Auth blocked | **NO** — existing Vercel CLI session |
| Manual deploy/redeploy | **NOT PERFORMED** |
| `vercel env pull` / `get` | **NOT USED** |

## Methods used (read-only)

| Method | Purpose |
|--------|---------|
| Vercel CLI `vercel ls <project>` | Recent deployment list + host suffixes |
| Vercel CLI `vercel inspect <host> --json` | Deployment ID, target, READY state |
| GitHub REST `commits/{sha}/status` | Vercel GitHub App contexts + deployment target URLs |
| GitHub REST `pulls/315` | Merge timestamp + merge commit SHA |

## Rate-limit note

Prior PR #314 evidence gates observed **Vercel deployment rate limited** on some projects. This gate observes **success** on all four Vercel commit-status contexts for **`1e4a076`** — rate-limit **not blocking** deployment-status metadata here.

---

*End.*
