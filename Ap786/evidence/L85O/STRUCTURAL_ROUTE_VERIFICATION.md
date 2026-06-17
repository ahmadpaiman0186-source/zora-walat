# L-85O — Structural route verification

**Method:** Unauthenticated `GET` only. **No `OPS_HEALTH_TOKEN`.** No authenticated DB proof.

---

## 1) Pre-deploy probe (baseline)

| Path | HTTP | Content | Notes |
|------|------|---------|-------|
| `/health` | 200 | JSON | `status: ok` |
| `/ops/db-readonly-proof` | 404 | HTML | `is_html_404: true` |
| `/api/admin/ops/db-readonly-proof` | 404 | HTML | `is_html_404: true` |

---

## 2) Post-deploy probes

| Path | HTTP | JSON | Elapsed | Safe contract fields | Result |
|------|------|------|---------|----------------------|--------|
| `/api/index` | 200 | **YES** | ~1.1s | `status: ok` | API entry live |
| `/health` | 200 | **YES** | fast | `status: ok` | Liveness OK |
| `/ops/health` | — | — | **timeout** (120s) | none | Handler hang |
| `/ops/db-readonly-proof` | 500 | **YES** (once) | ~7.3s | **none** | Not fail-closed contract |
| `/ops/db-readonly-proof` | — | — | **timeout** (45–90s) | none | Subsequent probes |

## 3) Structural success criteria evaluation

| Criterion | Met |
|-----------|-----|
| `/health` returns 200 JSON | **YES** |
| `/ops/db-readonly-proof` NOT 404 HTML | **YES** (post-deploy) |
| `/ops/db-readonly-proof` safe JSON fail-closed (`401`/`403` or `verdict: BLOCKED`, `token_missing`) | **NO** |
| `secret_disclosure: false` in response | **NOT OBSERVED** (no contract payload) |
| No DB rows / host / URL / token in captured evidence | **YES** |

## 4) Structural route verification verdict

| Verdict | **FAIL** |
|---------|----------|
| Reason | Route no longer 404 HTML, but **does not** reliably return required safe fail-closed JSON; observed **500 JSON** and **timeouts** via full Express cold path (`getHandler()`) |

## 5) Diagnosis note (tracked code, not new proof)

`/ops/db-readonly-proof` is **not** a slim pre-bootstrap route in `server/api/index.mjs`; it requires full Express graph. This may cause serverless cold-start timeouts unrelated to route registration absence.

**Future correction (separate gate):** slim bypass for `/ops/db-readonly-proof` or ops-route cold-start hardening — **not executed in L-85O**.

---

## 6) L-85O restrictions honored

| Restriction | Status |
|-------------|--------|
| Authenticated proof attempted | **NO** |
| DB query performed | **NO** |
| `READ_ONLY_DATABASE_URL` verified | **NO** |

---

*End.*
