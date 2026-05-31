# L-35 screenshots-redacted — operator intake folder

**Date:** 2026-05-31  
**Status:** **EMPTY** — awaiting operator-filed redacted PNG/PDF

---

## Intake rules

1. **Operator only** — capture from production Vercel/monitoring UIs in browser; **no** agent fabrication.
2. **Redact before commit:** env values, API keys, JWTs, full order/payment IDs, customer PII, raw webhook bodies.
3. **Filename pattern:** `OBS-{ID}-2026-05-31-redacted.png` (see [SCREENSHOT_MANIFEST.md](../SCREENSHOT_MANIFEST.md)).
4. **Forbidden filenames/content:** `unredacted`, `.env`, `secret`, full `dpl_` if policy requires redaction.

---

## Minimum set (L-35 scope)

| Filename (when filed) | OBS ID |
|-----------------------|--------|
| `OBS-DASH-PLATFORM-001-2026-05-31-redacted.png` | Platform / project overview |
| `OBS-DASH-MONEY-001-2026-05-31-redacted.png` | Money-path monitoring |
| `OBS-DASH-FULFILL-001-2026-05-31-redacted.png` | Fulfillment monitoring |
| `OBS-DASH-SEC-001-2026-05-31-redacted.png` | Security / auth monitoring |
| `OBS-SYNTH-UPTIME-001-2026-05-31-redacted.png` | Synthetic uptime (7d) — optional L-35+ |

---

## Current inventory

| Metric | Value |
|--------|-------|
| PNG/PDF files in this folder | **0** |
| Raw unredacted committed | **0** |

Operator: add files here, then re-run L-35 intake or open follow-up PR.
