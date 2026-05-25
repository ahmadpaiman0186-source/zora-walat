# STR-08 Risk Register

**Date:** 2026-05-25
**Status:** **OPEN AFTER SINGLE CONTROLLED PROBE**

---

## Risk Register

| ID | Risk | Severity | Control | Status |
|----|------|----------|---------|--------|
| STR08-R01 | Running more than one HTTP probe | **High** | Exact one-probe limit | **OPEN** |
| STR08-R02 | Mistaking invalid-signature rejection for payment processing proof | **Critical** | Conservative verdict says payment processing not proven | **OPEN** |
| STR08-R03 | Accidentally using Stripe replay/trigger instead of synthetic invalid signature | **Critical** | Stripe replay/test event forbidden | **OPEN** |
| STR08-R04 | Probing production endpoint | **Critical** | Approved endpoint is staging only | **OPEN** |
| STR08-R05 | Vercel logs do not show STR-06 markers | **Medium** | Mark visibility not captured/inconclusive | **OPEN** |
| STR08-R06 | Operator screenshots missing | **Medium** | Leave marker rows pending capture | **OPEN** |
| STR08-R07 | Overclaiming fix proof | **Critical** | Fix remains not fully proven | **OPEN** |

---

## Probe Execution Note

Exactly one approved invalid-signature POST was executed at `2026-05-25T21:07:23.278Z` and returned HTTP `400` with an empty response body. No retry was executed. Vercel log marker evidence remains pending operator capture.

---

## Conservative Verdict

STR-08 is a controlled observability probe only. It cannot prove payment processing or full webhook processing. Production, real-money, and controlled pilot remain **NO-GO**.

---

*Risk register - no risk closed until probe and log evidence are reviewed*
