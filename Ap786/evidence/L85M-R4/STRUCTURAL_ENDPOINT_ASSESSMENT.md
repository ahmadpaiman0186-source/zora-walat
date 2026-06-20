# L-85M-R4 — Structural endpoint assessment

**Gate UTC:** 2026-06-20

---

## Gate question

Is deployed `/ops/db-readonly-proof` structurally exposed after L-85M-R2B/R3 and **not** returning 404?

## Answer

**YES — structurally exposed; not 404.**

## Classification

| Rule | Outcome |
|------|---------|
| 401 / 403 / auth-required | **PASS** |
| 404 | FAIL |
| Observed | **401** + `reason: token_missing` + `auth_required: true` |

## Supporting signals

| Signal | Meaning |
|--------|---------|
| `X-Matched-Path: /api/ops/db-readonly-proof` | Root rewrite + bridge pickup observed |
| `prebootstrap_guard: true` | L-85P guard active before DB proof |
| Prior L-85M 404 HTML | **Superseded at structural layer** for this path |

## Explicit non-conclusions

| Item | Status |
|------|--------|
| L-85M runtime DB identity PASS | **NOT CLAIMED** |
| Authenticated proof | **NOT PERFORMED** |
| Webhook proof | **NOT PERFORMED** |

---

*End.*
