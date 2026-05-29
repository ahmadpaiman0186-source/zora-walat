# CORE-09 Pilot Exposure Limits

**Date:** 2026-05-29  
**Status:** **LIMITS FILED** — enforcement **NOT ACTIVE** (pilot not executed)

---

## 1. Purpose

Cap blast radius during any **future** controlled pilot. Limits apply at pilot start; breaching any limit → **mandatory abort**.

---

## 2. Numeric caps (default proposal — adjust only via signed DR)

| Limit | Default cap | Breach action |
|-------|-------------|---------------|
| **Max users** | 25 enrolled pilot users | Halt new enrollments |
| **Max transaction count** | 50 total pilot transactions | Freeze pilot |
| **Max transaction amount** | USD 25 equivalent per transaction | Block checkout |
| **Max daily exposure** | USD 500 equivalent aggregate per calendar day | Freeze pilot |
| **Max failed attempts** | 10 failed payment or provider attempts | Freeze + review |
| **Max pending review** | 5 orders in PENDING_REVIEW / ambiguous | Ops queue; halt dispatch |

All amounts: **test/staging or explicitly approved pilot currency** — not unbounded live exposure.

---

## 3. Structural prohibitions

| Prohibition | Rule |
|-------------|------|
| Broad public launch | **Forbidden** — invite-only pilot cohort |
| Unbounded provider execution | **Forbidden** — cap attempts per order (1 dispatch unless DR) |
| Auto-repair apply | **Forbidden** — CORE-08 dry-run only |
| Webhook broad replay | **Forbidden** |
| Production config change during pilot | **Forbidden** without change DR |
| Live Stripe without CORE-11 | **Forbidden** by default |

---

## 4. Monitoring counters (required at pilot start)

| Counter | Owner |
|---------|-------|
| `pilot_users_active` | Ops |
| `pilot_tx_count` | Engineering |
| `pilot_tx_amount_usd_equiv` | Finance witness |
| `pilot_failed_attempts` | SRE |
| `pilot_pending_review_count` | Ops |

Counters must be observable before pilot day 1 — evidence **CORE9-EV-OBS**.

---

## 5. Relationship to CORE-07 / CORE-08

| Track | Pilot limit interaction |
|-------|-------------------------|
| CORE-07 | Sandbox drill limits **separate**; do not consume pilot tx budget |
| CORE-08 | Repair plans only; **no** apply during pilot |

---

## 6. Conservative verdict

Exposure limits **filed only**. Pilot **not executed**. Limits **not enforced** in production.

---

*End of exposure limits.*
