# STR-02 — Vercel Domain Mapping Evidence Checklist

**Date:** 2026-05-24
**Parent:** [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md)

**Policy:** Read-only. **Do not add/remove domains.**

---

## 1. Target mapping

| Domain | Must map to |
|--------|-------------|
| `zora-walat-api-staging.vercel.app` | Project **`zora-walat-api-staging`** (API) |
| Stripe webhook URL host | Same domain |

**Full Stripe path:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`

---

## 2. Capture checklist

| # | Check | Evidence | Status |
|---|-------|----------|--------|
| D-01 | Correct project context | VRC-D06 | ☑ **CAPTURED** — `zora-walat-api-staging` |
| D-02 | `zora-walat-api-staging.vercel.app` listed | VRC-D06 | ☑ **CAPTURED** |
| D-03 | Production deployment **Ready** | VRC-D06 | ☑ **CAPTURED** |
| D-04 | Production assignment visible | VRC-D06 | ☑ **CAPTURED** (Overview → Production Deployment) |
| D-05 | Settings → Domains “Valid Configuration” row | VRC-D06 | ☐ **NOT IN FRAME** — capture is Overview domains row |
| D-06 | Domain matches DEST-01 / STR-02 endpoint host | Cross-ref | ☑ **FILED** (Stripe) |
| D-07 | No domain settings changed | Manifest §6 | ☑ **YES** |

**Note:** VRC-D06 filed from **Project Overview → Production Deployment** domains panel (operator filename `DOMAINS-ALIAS-MAPPING-006`). Host mapping to this project is **observed**; standalone Settings → Domains “Valid Configuration” text was **not** in the captured frame.

---

## 3. Hypothesis linkage

| Observation | Hypothesis |
|-------------|------------|
| Domain on **`zora-walat-api-staging`** project | H7 **partially supported** — host not mis-pointed to unrelated project |
| Webhook path missing on deploy (D05) | H4 / H2 — 404 still plausible despite correct host |
| Domain on old deployment | H10 **open** — deploy **bc5dec9** recorded |

---

## 4. Verdict

| Item | Status |
|------|--------|
| VRC-D06 | **CAPTURED** |
| Domain mapping to project | **OBSERVED** |
| Webhook route reachable | **NOT CONFIRMED** |
| Root cause | **NOT CONFIRMED** |

---

*Domain mapping checklist · D06 CAPTURED · host OK · route missing on deploy*
