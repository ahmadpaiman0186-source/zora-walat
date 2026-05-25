# STR-02 Auto-Detection / Auto-Repair Dry-Run Design

**Date:** 2026-05-24
**Parent:** [Super-System Route Intelligence Pack](./ZORA_WALAT_SUPER_SYSTEM_ROUTE_INTELLIGENCE_PACK_2026_05_24.md)

**Policy:** Detection and recommendations only. Apply mode is **unsupported / disabled**.

---

## 1. Detection Inputs

| Input | Detection |
|-------|-----------|
| Root `vercel.json` | Exact `/webhooks/stripe` rewrite to `/api/webhooks/stripe` |
| Root bridge | `api/webhooks/stripe.mjs` exists and reuses `server/api/slimStripeWebhookHandler.mjs` |
| Slim handler | Existing raw-body/signature verification path present |
| Frontend routes | `/`, `/history`, `/success`, `/cancel` files preserved |
| Bridge source | No obvious secrets, env renames, direct Prisma/payment mutations |

---

## 2. Failure Classification

| Failure | Hypothesis | Dry-run recommendation |
|---------|------------|------------------------|
| Rewrite missing | H-routing / H2 | Add exact root rewrite |
| Bridge missing | H4 | Add root serverless bridge |
| Slim handler not referenced | H4 / safety risk | Delegate to existing slim handler |
| Unsupported method not fail-closed | H-routing | Add POST-only 405 guard |
| Direct DB/payment code in bridge | Safety regression | Remove direct mutation; delegate only |

---

## 3. Dry-Run Status Fields

The self-repair report must include:

- `DETECTED`
- `LIKELY_CAUSE`
- `RECOMMENDED_PATCH`
- `RISK`
- `ROLLBACK`
- `REQUIRES_HUMAN_APPROVAL`

Current report: [self-repair dry-run](./ZORA_WALAT_STR02_SELF_REPAIR_DRY_RUN_REPORT_2026_05_24.md)

---

## 4. Apply Boundary

| Action | Status |
|--------|--------|
| Dry-run recommendation | **ALLOWED** |
| File mutation by repair engine | **NOT SUPPORTED** |
| Deploy / redeploy | **FORBIDDEN** |
| Endpoint probe | **FORBIDDEN** |
| Stripe resend/replay | **FORBIDDEN** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 5. Conservative Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| Static route bridge verification | **PASS** |
| Deployed Vercel route surface | **PENDING** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Auto-detection and dry-run design - no apply path*
