# STR-02 Post-Fix HTTP Proof Verdict Matrix

**Date:** 2026-05-24
**Parent:** [STR-02 post-fix sandbox HTTP proof](./ZORA_WALAT_STR02_POSTFIX_SANDBOX_HTTP_PROOF_2026_05_24.md)

**Policy:** Evidence interpretation only. Invalid-signature HTTP proof may establish route reachability but cannot establish Stripe event processing success.

---

## 1. Verdict Matrix

| Dimension | Evidence | Verdict |
|-----------|----------|---------|
| Approved scope | `APPROVE STR-02 POST-FIX SANDBOX WEBHOOK HTTP PROOF ONLY` | **YES** |
| Route path tested | `POST /webhooks/stripe` | **EXECUTED ONCE** |
| HTTP route reachability | Vercel-served `400` invalid-signature response | **PROVEN PARTIAL** |
| Fail-closed behavior | Invalid signature rejected before event processing | **CAPTURED** |
| Stripe event processing | No valid signed Stripe event sent | **NOT PROVEN** |
| HTTP 2xx Stripe processing | No valid Stripe event, no 2xx | **NOT ACHIEVED** |
| Vercel runtime log correlation | No log lookup/capture in this run | **NOT CAPTURED** |
| DB/payment/wallet/order mutation | Invalid signature stopped processing | **NO** |
| Fix status | Route reachable, processing unproven | **NOT FULLY PROVEN** |

---

## 2. Claim Boundary

| Allowed statement | Forbidden statement |
|-------------------|---------------------|
| Route reachability is **PROVEN PARTIAL** | Fix fully proven |
| Invalid signature fails closed with HTTP `400` | Stripe event processing succeeded |
| HTTP 2xx Stripe processing **NOT ACHIEVED** | Production-ready |
| Separate resend approval required | Real-money/pilot ready |

---

## 3. Conservative Verdict

| Item | Status |
|------|--------|
| Route reachability | **PROVEN PARTIAL** |
| Stripe event processing | **NOT PROVEN** |
| HTTP 2xx Stripe processing | **NOT ACHIEVED** |
| Fix | **NOT FULLY PROVEN** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Verdict matrix - invalid-signature reachability only*
