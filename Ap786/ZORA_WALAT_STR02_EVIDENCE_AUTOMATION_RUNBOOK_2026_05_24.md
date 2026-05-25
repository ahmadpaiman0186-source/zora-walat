# STR-02 Evidence Automation Runbook

**Date:** 2026-05-24
**Parent:** [Super-System Route Intelligence Pack](./ZORA_WALAT_SUPER_SYSTEM_ROUTE_INTELLIGENCE_PACK_2026_05_24.md)

**Policy:** Local screenshot ingestion only. No OCR, no browser scraping, no API calls, no endpoint probes.

---

## 1. Command

```text
node server/scripts/ingest-str02-pr72-vercel-screenshots.mjs
```

Output:

- `Ap786/evidence/str02-super-system-route-intelligence-2026-05-24/STR02_EVIDENCE_INGESTION_REPORT.json`
- `Ap786/ZORA_WALAT_STR02_EVIDENCE_INGESTION_REPORT_2026_05_24.md`

---

## 2. Search Locations

| Location | Notes |
|----------|-------|
| `Downloads` | Local operator downloads |
| `Pictures/Screenshots` | Windows screenshot folder if present |
| `Desktop` | Manual saved captures |
| `Downloads/Telegram Desktop` | Telegram desktop downloads |
| `AppData/Local/Packages/TelegramMessengerLLP.TelegramDesktop_*` | Telegram UWP cache |

---

## 3. Expected Filenames

| Evidence ID | Filename |
|-------------|----------|
| PR72-D01 | `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-001.png` |
| PR72-D02 | `VERCEL-PR72-BUILD-OUTPUT-002.png` |
| PR72-D03 | `VERCEL-PR72-DEPLOYMENT-FUNCTIONS-ROUTES-003.png` |
| PR72-D04 | `VERCEL-PR72-ROUTE-REWRITE-WEBHOOK-STRIPE-004.png` |
| PR72-D05 | `VERCEL-PR72-DOMAIN-MAPPING-005.png` |
| PR72-D06 | `VERCEL-PR72-LOGS-WEBHOOK-STRIPE-SEARCH-006.png` |
| PR72-D07 | `VERCEL-PR72-LOGS-STRIPE-SEARCH-007.png` |

---

## 4. Current Result

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| Static route bridge verification | **PASS** |
| Ingestion report | **PENDING_CAPTURE** |
| Screenshots ingested | **0** |
| Deployed Vercel route surface | **PENDING** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 5. Operator Guidance

Capture screenshots manually from the Vercel dashboard. Preserve evidence-critical values (project, deployment, commit, route/function list, domain, log filters). Redact account identifiers in the browser URL if visible.

Do **not** send requests to `/webhooks/stripe`. Do **not** click Resend.

---

*Evidence automation runbook - local ingestion only*
