# CORE-10 Abort and Stop Conditions

**Date:** 2026-05-29  
**Staging scan:** **NOT EXECUTED**

---

## 1. Immediate stop triggers

| # | Condition | Action |
|---|-----------|--------|
| T1 | **Environment ambiguity** — cannot confirm staging | Abort before export |
| T2 | **Live credential suspicion** | Abort; rotate review |
| T3 | **Production DB risk** — wrong connection string | Abort; audit access |
| T4 | **Provider / live-mode ambiguity** | Abort |
| T5 | **Stripe live-mode ambiguity** | Abort |
| T6 | **Missing redaction** on snapshot or logs | Halt filing; re-export |
| T7 | **Unexpected mutation path** (write query, POST) | Abort; incident record |
| T8 | **Missing operator approval** (capture phrase) | Do not export |
| T9 | **Runtime Doctor critical finding** not understood | Hold verdict; ops review |
| T10 | **Audit/log correlation missing** when claimed | FAIL evidence row |
| T11 | **Operator uncertainty** | Abort |
| T12 | Vercel/log access without approval | Abort |

Operator phrase: **`CORE-10 SCAN ABORT`**.

---

## 2. Response sequence

| Step | Action |
|------|--------|
| 1 | Stop export / log pull immediately |
| 2 | Preserve partial artifacts only if redacted |
| 3 | Do not run doctor on unredacted dump |
| 4 | Open CORE10-INC-* record |
| 5 | Notify engineering lead + program lead |
| 6 | Mark CORE10-EV rows **FAIL** or **PENDING** |
| 7 | Do not claim observability proof |

---

## 3. Fail-closed defaults

| Uncertainty | Outcome |
|-------------|---------|
| Staging vs prod unknown | **NO-GO** |
| Redaction incomplete | **NO-GO** |
| Doctor verdict FAIL + unexplained | **NO-GO** for staging proof |
| Cannot correlate audit | **WARN** minimum — not PASS |

---

## 4. Relationship to CORE-09

Abort during CORE-10 capture → pilot gate remains **NO-GO** (CORE9 unchanged).

---

## 5. Conservative verdict

Stop conditions **filed only**. Staging scan **not executed**.

---

*End of abort conditions.*
