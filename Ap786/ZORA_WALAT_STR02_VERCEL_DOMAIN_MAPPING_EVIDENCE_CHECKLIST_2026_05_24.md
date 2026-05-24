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

| # | Check | Vercel path | Evidence | Status |
|---|-------|-------------|----------|--------|
| D-01 | Domains page open for correct project | Settings → Domains | VRC-D06 | ☐ **PENDING** |
| D-02 | `zora-walat-api-staging.vercel.app` listed | Same | VRC-D06 | ☐ **PENDING** |
| D-03 | Domain status **Valid** / **Active** | Same | VRC-D06 | ☐ **PENDING** |
| D-04 | Production vs Preview assignment visible | Same | VRC-D06 | ☐ **PENDING** |
| D-05 | No duplicate domain on wrong project (visual check) | Team projects list if needed | Operator note | ☐ **PENDING** |
| D-06 | Domain matches DEST-01 / STR-02 endpoint host | Cross-ref evidence | STR-02A | ☐ **FILED** (Stripe) |
| D-07 | No domain settings changed | Attestation | Manifest | ☐ **PENDING** |

---

## 3. Hypothesis linkage

| Observation | Hypothesis |
|-------------|------------|
| Domain on API project | H7 **partially supported** |
| Domain on Next/root project | H2 **more plausible** |
| Domain on old deployment | H10 **open** |

---

## 4. Verdict (default)

| Item | Status |
|------|--------|
| VRC-D06 | **PENDING CAPTURE** |
| Domain mapping confirmed | **NOT CONFIRMED** |
| Root cause | **NOT CONFIRMED** |

---

*Domain mapping checklist · read-only · no domain mutation*
