# CORE-02 Reloadly Sandbox vs Real Provider Boundary

**Date:** 2026-05-29  
**Status:** **SPECIFICATION ONLY**  
**No Reloadly API calls authorized by this document.**

---

## 1. Boundary label

`RELOADLY SANDBOX / SIMULATION — NOT PRODUCTION PROVIDER PROOF`

---

## 2. What sandbox is (simulation)

| Element | Sandbox behavior (planning) |
|---------|----------------------------|
| API base | Sandbox Topups host (per operator env policy) |
| OAuth audience | Sandbox credentials |
| Balance impact | Test / sandbox ledger — **not** proof of real subscriber credit |
| Catalog | May be incomplete, stale, or test-only SKUs |
| Errors | Useful for retry/timeout drills — **not** production SLO proof |
| Cost | No real wholesale settlement proof |

**Use sandbox for:** workflow drills, idempotency exercises, operator training, sanitized trace capture.

---

## 3. What is real provider behavior

| Element | Real (production) behavior |
|---------|--------------------------|
| API base | Production Topups host |
| Fulfillment | Actual operator network delivery (subject to MNO) |
| Catalog | Must match commercial offers |
| Pricing | Wholesale quotes binding for margin controls |
| Incidents | Real customer impact; regulatory / partner escalation |

**Real provider proof requires:** separate approval, production credentials governance, and evidence IDs **beyond** sandbox-only rows.

---

## 4. What sandbox is NOT

| Misinterpretation | Correction |
|-------------------|------------|
| “Sandbox success = launch ready” | **FALSE** — NO-GO for launch |
| “Sandbox HTTP 200 = customer received airtime” | **NOT PROVEN** without production correlation |
| “One sandbox operator test covers all AF operators” | **FALSE** — per-operator evidence required |
| “Reloadly sandbox = Stripe sandbox” | **Independent** boundaries |

---

## 5. Evidence required before sandbox runtime execution

| # | Requirement | Status |
|---|-------------|--------|
| 1 | CORE02-DR signed — scope lists corridors, operators, max spend | **PENDING** |
| 2 | CORE2-EV-SBX-01..03 accepted | **PENDING** |
| 3 | Abort / rollback plan linked | **PENDING** |
| 4 | No production `RELOADLY_SANDBOX=false` on staging by mistake | **PENDING** (checklist) |
| 5 | Secrets rotation boundary documented (names only) | **PENDING** |

**Until 1–3 accepted → provider execution NO-GO.**

---

## 6. Evidence required before treating results as “real”

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Production credential DR | **NOT APPROVED** |
| 2 | Production catalog diff signed | **PENDING** |
| 3 | Live fulfillment trace with redacted MSISDN | **PENDING** |
| 4 | Reconciliation with finance | **PENDING** |
| 5 | No-pay-no-service production drill | **PENDING** |

**Real-money / production provider: NO-GO.**

---

## 7. Failure and ambiguity in sandbox

| Event | Planning response |
|-------|-------------------|
| Sandbox 401/403 | Stop drill; fix credentials — **no** user-facing prod impact |
| Sandbox timeout | Fail-closed; file CORE2-EV-SBX-05 |
| Ambiguous 200 body | **Do not** mark delivered — pending verification |
| Sandbox success + Stripe paid (test) | File correlation only — **not** launch proof |

---

## 8. Rollback-safe sandbox drill

| Action | Rollback |
|--------|----------|
| Enable sandbox creds for drill | Revoke / rotate per ops policy |
| Run approved script | Stop worker; mark orders **manual review** if any test rows created |
| File evidence | Update manifest **ABORTED** if drill invalidated |

---

## 9. NO-GO reconfirmation

| Item | Status |
|------|--------|
| Production Reloadly | **NO-GO** |
| Real-money + Reloadly fulfill | **NO-GO** |
| Provider ready | **NOT CLAIMED** |
| Fix proven | **NOT CLAIMED** |

---

*End of sandbox vs real boundary.*
