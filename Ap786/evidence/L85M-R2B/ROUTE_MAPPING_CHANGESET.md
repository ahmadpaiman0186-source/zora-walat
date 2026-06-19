# L-85M-R2B — Route mapping changeset

**Gate UTC:** 2026-06-19

---

## File

`vercel.json` (root)

## Additions only

Two rewrites appended after existing `/create-checkout-session` entry:

| Source | Destination |
|--------|-------------|
| `/ops/db-readonly-proof` | `/api/ops/db-readonly-proof` |
| `/ops/health` | `/api/ops/health` |

## Preserved mappings (unchanged)

| Source | Destination |
|--------|-------------|
| `/webhooks/stripe` | `/api/webhooks/stripe` |
| `/health` | `/api/health-ready?route=health` |
| `/api/health` | `/api/health-ready?route=health` |
| `/ready` | `/api/health-ready?route=ready` |
| `/api/ready` | `/api/health-ready?route=ready` |
| `/create-checkout-session` | `/api/create-checkout-session` |

## Explicitly not added

- `/ops/(.*)` catch-all rewrite
- Any change to webhook rewrite ordering relative to ops paths (ops entries are additive at end)

---

*End.*
