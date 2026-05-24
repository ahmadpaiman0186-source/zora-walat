# STR-02 — 404 Vercel Routing Hypothesis Matrix

**Date:** 2026-05-24
**Parent:** [root-cause investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md)

**Policy:** Hypotheses only. **No hypothesis confirmed** without gated evidence.

---

## 1. Evidence anchors

| Evidence | Relevant fact |
|----------|---------------|
| STR-02B | Stripe reports **404 ERR / Not Found** after manual Resend (May 24, 2026) |
| VRC-01 | Vercel Logs — `"/webhooks/stripe"` — **No logs found** |
| VRC-02 | Vercel Logs — `stripe` — **No logs found** |
| STR-01B | Prior attempts **Timed out** (May 19) — different failure mode |
| DEST-01 | Destination **Active** at staging URL |
| Repo | `server/api/index.mjs` handles `POST /webhooks/stripe` |
| Repo | Root `vercel.json` = Next.js; `server/vercel.json` = API catch-all |

---

## 2. Hypothesis matrix (H1…H10)

| ID | Hypothesis | Plausibility | Supporting signals | Contradicting / open questions | Status |
|----|------------|--------------|-------------------|-------------------------------|--------|
| **H1** | Stripe URL correct but staging deployment does not expose `POST /webhooks/stripe` | **High** | 404; no runtime logs | Repo defines route | **OPEN / PLAUSIBLE** |
| **H2** | Vercel project routing points to wrong app/package/output | **High** | Root Next vs `server/` API split; deploy guard exists | DEP-01 shows API staging project | **OPEN / PLAUSIBLE** |
| **H3** | `vercel.json` or rewrite mismatch → 404 before runtime handler | **High** | 404 without logs | `server/vercel.json` catch-all looks correct in repo | **OPEN / PLAUSIBLE** |
| **H4** | Serverless function exists locally but not in deployed output | **Medium** | 404; no logs | Cannot inspect build without Vercel read-only | **OPEN** |
| **H5** | Route method mismatch (GET/POST/ANY) | **Low** | Stripe sends POST; repo expects POST | Would often be 405 not 404 | **OPEN / LOWER** |
| **H6** | Path mismatch: `/api/webhooks/stripe` vs `/webhooks/stripe` | **Medium** | Some Vercel apps use `/api` prefix | Repo slim path is `/webhooks/stripe` not `/api/...` | **OPEN** |
| **H7** | Staging domain points to deployment without current webhook route | **High** | 404; domain/project drift | DEST-01 shows correct URL string | **OPEN / PLAUSIBLE** |
| **H8** | Middleware/auth/static routing intercepts before webhook handler | **Medium** | 404 at edge possible | API catch-all should forward to index | **OPEN** |
| **H9** | Vercel logs filtered/incomplete; Stripe hit edge/static 404 | **High** | VRC no-match; Stripe still got HTTP 404 | Stripe did receive **some** HTTP response | **OPEN / PLAUSIBLE** |
| **H10** | Old deployment or wrong environment alias targeted | **Medium** | DEP-01 SHA may differ from live | Need deploy timeline vs Resend | **OPEN** |

---

## 3. Failure mode evolution

```text
May 19 (STR-01):  timeout × 3  →  request may have reached host slowly / hung
May 24 (STR-02):  404 Not Found →  request rejected before observable runtime handler
```

**Conservative read:** Timeout → 404 shift **does not** prove fix progress; may indicate **different routing layer** responding (H9) or **deployment/config change** (H7, H10).

---

## 4. Discrimination tests (future — read-only where noted)

| Test | Discriminates | Safe? |
|------|---------------|-------|
| Vercel project settings: Root Directory = `server` | H2, H7 | Read-only |
| Vercel deployment file list includes `api/index.mjs` | H4 | Read-only |
| Compare DEP-01 commit SHA to deployment active at Resend time | H10 | Read-only |
| `curl -I` staging `/webhooks/stripe` (no Stripe payload) | H1, H5, H9 | Gated — no mutation |
| Vercel request log / edge log (if available) | H9 | Read-only |

**Forbidden in investigation pack:** Resend, deploy, env edit, code change.

---

## 5. Verdict

| Item | Status |
|------|--------|
| Leading hypotheses | **H1, H2, H3, H7, H9** — all **OPEN** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |

---

*Hypothesis matrix · no root cause confirmed*
