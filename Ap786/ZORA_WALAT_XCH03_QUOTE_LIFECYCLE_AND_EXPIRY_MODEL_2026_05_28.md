# XCH-03 Quote Lifecycle And Expiry Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Lifecycle states

| State | Meaning | Terminal |
|-------|---------|----------|
| `quote_requested` | Client initiated pricing | NO |
| `quote_priced` | Rate/fee/tax computed | NO |
| `quote_shown` | Presented to sender | NO |
| `quote_accepted` | Sender confirmed; funding may proceed | NO |
| `quote_expired` | Past `expiresAt` | **YES** |
| `quote_cancelled` | User or system cancelled | **YES** |
| `quote_rejected` | Policy/compliance rejection | **YES** |
| `quote_re_priced` | New price superseded prior quote | NO (links `supersedesQuoteId`) |

Illegal transitions **reject** (fail-closed).

---

## 2. State flow (conceptual)

```text
quote_requested → quote_priced → quote_shown
       ↓                              ↓
quote_rejected              quote_accepted → (funding gate, future)
       ↓                              ↓
quote_cancelled              quote_expired
```

---

## 3. Quote expiry window

| Parameter | Proposed | Status |
|-----------|----------|--------|
| Default TTL | 60–120 seconds per corridor | **DESIGN ONLY** |
| Extension | **Not allowed** without new quote | **REQUIRED** |
| Clock authority | Server `expiresAt` | **REQUIRED** |

---

## 4. Stale quote handling

| Condition | Action |
|-----------|--------|
| `now > expiresAt` | Transition to `quote_expired`; reject acceptance |
| Rate source stale per policy | **Fail closed** — re-price or reject |
| Fee policy version changed mid-session | Require new quote |

---

## 5. Re-pricing

| Trigger | Behavior |
|---------|----------|
| User requests refresh | New `quoteId`; prior quote → `quote_re_priced` or `quote_cancelled` |
| Provider rate drift beyond threshold | Auto invalidate shown quote |

---

## 6. Execution claims boundary

| Claim | Status |
|-------|--------|
| Quote shown | **Does not** guarantee funding success |
| Quote accepted | **Does not** guarantee payout delivery |
| Guaranteed execution | **FORBIDDEN** |

---

*XCH-03 quote lifecycle — spec only*
