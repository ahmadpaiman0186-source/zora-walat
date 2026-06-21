# L-85M-R5-R4B — Target time window

**Gate UTC:** 2026-06-21

---

## Primary anchor (R5-R4 evidence)

| Field | Value |
|-------|--------|
| Source | `Ap786/evidence/L85M-R5-R4/HTTP_RESPONSE_SUMMARY.md` |
| Response `Date` header | `Sun, 21 Jun 2026 07:58:15 GMT` |
| Anchor UTC | **`2026-06-21T07:58:15Z`** |

## Investigation window (this gate)

| Field | Value |
|-------|--------|
| Margin | **±20 minutes** |
| Window start | **`2026-06-21T07:38:15Z`** |
| Window end | **`2026-06-21T08:18:15Z`** |

## Deployment correlation (metadata)

| Field | Value |
|-------|--------|
| Staging project | **`zora-walat-api-staging`** |
| Production alias | `https://zora-walat-api-staging.vercel.app` |
| Active production deploy @ anchor (from R5T-R3D + inspect) | **`zora-walat-api-staging-jeku6t6ta.vercel.app`** |
| Deployment ID | **`dpl_E1qVq7vcY22e7tU71hGwbjb7N3wD`** |
| Expected commit context (prior gate) | **`a83ae84`** (PR #310 merge — pre R5-R4 proof retry deploy pickup) |
| R5-R4 anchor inside deploy active window | **YES** (deploy ready ~`07:15:18Z`; R5-R4 @ `07:58:15Z`) |

---

*End.*
