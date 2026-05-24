# G-02 — Evidence Acceptance Criteria

**Date:** 2026-05-23
**Gate:** G-02
**Parent:** [DRY_RUN_REHEARSAL](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md) · [CAPTURE_MAP](./ZORA_WALAT_G02_SCREENSHOT_CAPTURE_MAP_2026_05_23.md)

**Policy:** Defines what future evidence may support **fix proven review candidate** — **not** production-ready claim.

---

## 1. What evidence is sufficient (future, post-approval)

| Category | Sufficient when |
|----------|-----------------|
| **Destination registered** | DEST-01 shows sandbox destination + staging URL + test-mode |
| **Replay delivery** | STR-02 shows HTTP **200** for `checkout.session.expired` |
| **Lifecycle correlation** | LOG-01…LOG-04 in same ±15 min window as STR-02 |
| **Cross-correlation** | Same event id / request id / timestamp links STR-02 ↔ LOG-01…04 |
| **Minimum fix review candidate** | **STR-02 + LOG-01 + LOG-02 + LOG-03 + LOG-04** correlated |

Optional: LOG-05 for duplicate idempotency; STR-01 for pre-replay baseline.

---

## 2. What evidence is insufficient

| Evidence alone | Why insufficient |
|----------------|------------------|
| DEP-01 only | Deploy ≠ webhook health |
| BLK-01 / BLK-02 only | Blockers ≠ fix proof |
| DEST-01 only | Destination ≠ successful delivery |
| STR-01 only | Baseline ≠ post-replay success |
| STR-02 only (no logs) | HTTP 200 without lifecycle proof |
| LOG-01…04 without STR-02 | Logs without matching Stripe delivery |
| Screenshot-only bundle | No correlated ids / timestamps |
| Dry-run docs filed | Planning ≠ execution proof |

---

## 3. Why screenshot-only without logs is insufficient

Stripe Dashboard may show HTTP 200 while staging handler failed silently, timed out after ack, or wrote to wrong project. **Vercel lifecycle logs** (`webhook_received` → `signature_verified` → `event_persisted` → `ack_returned`) prove the code path executed on **staging**.

---

## 4. Why HTTP 200 without lifecycle logs is insufficient

HTTP 200 on Stripe delivery detail proves Stripe received a response — **not** that PR #55 fast-ack/async path ran correctly. Missing LOG-01…04 → **INCONCLUSIVE** for fix proven.

---

## 5. Why logs without matching Stripe event ID are insufficient

Un correlated logs may be from unrelated requests, prior deploys, or wrong Vercel project. Reviewer must tie STR-02 event id (redacted in manifest) to log search window and request id.

---

## 6. Required minimum for future “fix proven review candidate”

| Requirement | Detail |
|-------------|--------|
| **STR-02** | Post-replay HTTP 200 for target event |
| **LOG-01** | `webhook_received` |
| **LOG-02** | `signature_verified` |
| **LOG-03** | `event_persisted` |
| **LOG-04** | `ack_returned` |
| **Correlation** | Event id / request id / timestamp alignment documented in operator log |

**Outcome label:** “Fix proven **review candidate**” — human review still required. **Not** auto-approved.

---

## 7. Still no production-ready claim after staging evidence

Even if staging correlation passes review:

| Claim | Status |
|-------|--------|
| Fix proven (staging) | Requires human sign-off — default **NOT YET** |
| Fix proven (production) | **NOT YET** — out of scope |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 8. Verdict (current)

| Item | Status |
|------|--------|
| G-02 execution dry-run | **FILED / EXECUTION NOT AUTHORIZED** |
| Evidence acceptance | **CRITERIA FILED** — no captures accepted yet |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |

---

*Acceptance criteria · conservative · staging only · no production claim*
