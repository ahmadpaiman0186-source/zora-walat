# STR-02 — Vercel Diagnostic Verdict Matrix

**Date:** 2026-05-24
**Parent:** [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md) · [404 hypothesis matrix](./ZORA_WALAT_STR02_404_VERCEL_ROUTING_HYPOTHESIS_MATRIX_2026_05_24.md)

**Policy:** Verdicts default **NOT CONFIRMED** until full VRC-D01…D07 review complete.

---

## 1. Immutable STR-02 facts

| Fact | Status |
|------|--------|
| STR-02 Resend executed once | **YES** |
| Result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| VRC-01 / VRC-02 (prior) | **NO MATCH** |

---

## 2. Diagnostic dimension matrix

| Dimension | Question | Evidence | Pre-capture verdict | Post-capture (2026-05-24) |
|-----------|----------|----------|---------------------|---------------------------|
| **Project root** | Root Directory = `server`? | VRC-D01, VRC-D02 | **NOT CONFIRMED** | **NO** — Root Directory = **`./`** |
| **Monorepo vs server** | Next.js root deploy? | VRC-D01, VRC-D02 | **OPEN / PLAUSIBLE (H2)** | **STRENGTHENED / NOT CONFIRMED** |
| **Deploy lineage** | `main` + PR #55+ SHA at STR-02? | VRC-D03 | **NOT CONFIRMED** | _pending_ |
| **Build output** | `api/index.mjs` in deploy? | VRC-D04 | **NOT CONFIRMED** | _pending_ |
| **Functions / routes** | Catch-all to API entry? | VRC-D05 | **NOT CONFIRMED** | _pending_ |
| **Domain mapping** | Host → API project? | VRC-D06 | **NOT CONFIRMED** | _pending_ |
| **Runtime logs** | Any `/webhooks/stripe` log? | VRC-D07, VRC-01/02 | **NOT FOUND** | **NOT FOUND** |
| **Route exposure** | POST `/webhooks/stripe` plausible? | D01–D05 combined | **NOT CONFIRMED** | **LOW PLAUSIBILITY** (root `./` vs `server/`) |
| **Edge 404 without logs** | H9 consistent? | VRC-01/02 + STR-02B | **PLAUSIBLE / NOT CONFIRMED** | **PLAUSIBLE / NOT CONFIRMED** |

---

## 3. Hypothesis update gate (link to H1…H10)

| ID | Update rule | Post D01/D02 status |
|----|-------------|---------------------|
| H1 | **REJECT** only if VRC-D05 shows explicit `/webhooks/stripe` route **and** logs prove handler ran | **OPEN** |
| H2 | **CONFIRM** if VRC-D01 shows repo root + Next.js framework | **STRENGTHENED** — root = **`./`**; framework preset **not fully captured** → **NOT CONFIRMED** |
| H3 | **CONFIRM** if VRC-D05 shows missing catch-all / wrong rewrites | **OPEN** — await D05 |
| H4 | **CONFIRM** if VRC-D04/D05 missing `api/index.mjs` | **OPEN** — await D04/D05 |
| H7 | **REJECT** if VRC-D06 shows domain on wrong project | **OPEN** — await D06 |
| H9 | **CONFIRM** if 404 + no logs + edge/static routing indicators | **PLAUSIBLE / NOT CONFIRMED** |
| H10 | **CONFIRM** if VRC-D03 SHA predates webhook route or wrong branch | **OPEN** — await D03 |

Full definitions: [404 hypothesis matrix](./ZORA_WALAT_STR02_404_VERCEL_ROUTING_HYPOTHESIS_MATRIX_2026_05_24.md)

---

## 4. Captured build settings (supporting — not root-cause proof)

| Setting | Value | Routing impact |
|---------|-------|----------------|
| Node.js Version | **24.x** | Recorded; does not explain 404 alone |
| Ignored Build Step | **Automatic** | Recorded |
| On-demand Concurrent Builds | **Disabled** (one at a time) | Recorded |
| Build Machine | **Team Default (None)** | Recorded |
| Deployment Checks | **No checks configured** | Recorded |
| Rolling Releases | **Disabled** | Recorded |
| Prioritize Production Builds | **Enabled** | Recorded |

---

## 5. Overall verdict table

| Verdict item | Status |
|--------------|--------|
| STR-02 result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Vercel runtime correlation | **NOT FOUND** |
| Vercel project settings | **CAPTURED** (VRC-D01, D02, D02A…D02D) |
| Vercel deployment/domain/logs | **PENDING** (VRC-D03…D07) |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production launch | **NO-GO** |
| Real money | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 6. Sign-off (default)

| Role | Root cause confirmed? | Fix authorized? |
|------|----------------------|-----------------|
| Engineering | **NO** | **NO** |
| SRE / On-call | **NO** | **NO** |
| Payments Owner | **NO** | **NO** |

---

*Diagnostic verdict matrix · D01/D02 partial update · root cause NOT CONFIRMED*
