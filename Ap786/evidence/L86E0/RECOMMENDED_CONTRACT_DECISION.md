# L-86E-0 — Recommended contract decision

**Advisory — operator authorization required for any L-86E-1 implementation**

---

## Primary recommendation: **Option C — DEFER**

Defer formal adoption of Option A or B as a **new** proof-chain contract until:

1. **L-85M** runtime route/proof retry succeeds (or successor gate closes 404/entrypoint gap per L-85X).
2. Staging **webhook deploy surface** is structurally verified (which handler serves `/webhooks/stripe`).

**Rationale:** Changing or even test-codifying dispute contract while staging money-path proof is **BLOCKED** risks audit ambiguity and premature claims.

---

## Secondary recommendation: **Option B as de facto authoritative contract**

If documentation must name a contract **today** without implementation:

| Decision | Detail |
|----------|--------|
| **Authoritative runtime contract** | **Option B** — current `main` graceful in-tx behavior |
| **NOT recommended now** | **Option A** — material behavior change; PR #5 must not merge |
| **PR #5** | **KEEP_OPEN_BLOCKED** |

Option B reflects tracked source: lookup failure → ops events → `{ updated: 0 }` → tx commit → **HTTP 200 ack**.

---

## Option A — when to reconsider

Revisit Option A only after:

- Explicit operator authorization for **money-path behavior change**
- Staging webhook proof on the **actual** production entrypoint
- Written tradeoff acceptance: **503 + Stripe retries** vs **200 + no retry recovery**

Do **not** merge PR #5 to achieve Option A.

---

## Merge PR #5

**NO** — unchanged from L-86C / L-86D / L-86E-0.

---

*End.*
