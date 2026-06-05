# L-60 — Rollback abort rules

**Date:** 2026-06-05
**Applies to:** L-60 planning and all future rollback-related sessions until re-authorized

---

## Immediate abort triggers

| # | Trigger |
|---|---------|
| 1 | Click rollback / instant rollback / promote deployment |
| 2 | Deploy or redeploy to prod |
| 3 | Modify Vercel project settings, env, domains, or Git integration |
| 4 | Modify GitHub branch protection or workflow dispatch for prod |
| 5 | Trigger incident or acknowledge for rollback drill |
| 6 | Payment / webhook / provider / DB mutation |
| 7 | Secret exposure in evidence |
| 8 | Self-healing apply |
| 9 | Claim rollback **proven** or row 10 **PASS** without executed drill evidence |
| 10 | Claim launch-ready or FULLY_PROVEN |

---

## Abort response

| Step | Action |
|------|--------|
| 1 | Stop session |
| 2 | Document abort in attestation MD |
| 3 | Do not upgrade L-45 row 10 |
| 4 | Preserve **NO-GO** posture |

---

## L-60 session

No rollback attempted. No abort triggered in Ap786 doc filing.

---

*End of rollback abort rules.*
