# Evidence Manifest — Staging Webhook Replay Proof (PR #55)

**Date:** 2026-05-23
**Merge SHA (main):** `c521b0f` · feature `abb9531` · staging deploy **`0cac02e`** (PR #56 descendant, includes PR #55)
**Mode:** Stripe **test / sandbox only** · Vercel **staging only**
**Last ingestion:** STR-01 (pre-replay baseline) from Telegram Desktop UWP — see [§6 Pass D](#pass-d--str-01-pre-replay-baseline-telegram-desktop-uwp-2026-05-24)

**Policy:** No fabricated screenshots. No **PASS** without filed PNG and operator review.

---

## 1. Staging deployment proof

| Evidence ID | Filename | Source | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|--------|----------------------|-----------|--------|--------|----------------|
| **DEP-01** | [VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png](./VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png) | Vercel Dashboard → `zora-walat-api-staging` → Deployments | Show staging deployment on **`main`**, **Ready**, commit **`0cac02e`** or PR #55+ descendant | Hide team tokens beyond staging host | **CAPTURED / REVIEW PENDING** | Staging project deployed from `main` with PR #55+ code lineage | Replay success; fix proven |

---

## 2. Stripe sandbox blocker evidence (G-02 replay prerequisites)

| Evidence ID | Filename | Source | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|--------|----------------------|-----------|--------|--------|----------------|
| **BLK-01** | [STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.png](./STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.png) | Stripe Dashboard → **Sandboxes** → Workbench → **Webhooks** → **Create an event destination** | Operator routed to create-destination flow; **no** existing `zora-walat-api-staging` destination visible; **Continue** not clicked | Account ID in URL → `REDACTED_STRIPE_ACCOUNT_ID` | **CAPTURED / BLOCKER EVIDENCE** | Sandbox has no registered staging webhook destination | Destination created; replay success |
| **BLK-02** | [STRIPE-SANDBOX-CHECKOUT-EXPIRED-NO-EVENT-DELIVERIES-001.png](./STRIPE-SANDBOX-CHECKOUT-EXPIRED-NO-EVENT-DELIVERIES-001.png) | Stripe Dashboard → **Sandboxes** → Workbench → **Events** | Search `checkout.session.expired` → **No event deliveries found** | Account ID in URL → `REDACTED_STRIPE_ACCOUNT_ID` | **CAPTURED / BLOCKER EVIDENCE** | No replayable expired delivery in current sandbox Events view | Fix proven; prior May 19 failures absent |

**BLK-01 note:** Operator opened Workbench → Webhooks and was routed to **Create an event destination** / **Configure your event destination** — read-only capture; **no destination created**.

**BLK-02 implication:** STR-01 / STR-02 replay proof **BLOCKED** until staging webhook destination exists **and** a deliverable `checkout.session.expired` event exists. Unblock pack: [G-02 approval](../../ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md) — **APPROVAL REQUIRED / NOT EXECUTED**.

---

## 2b. Sandbox destination proof (existing active — no new destination created)

| Evidence ID | Filename | Source | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|--------|----------------------|-----------|--------|--------|----------------|
| **DEST-01** | [STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.png](./STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.png) | Stripe **Sandboxes** → Workbench → **Webhooks** → `zora-walat-api-staging` | Existing destination **Active**; endpoint `https://zora-walat-api-staging.vercel.app/webhooks/stripe`; sandbox banner visible; **no new destination created** | URL account token → black bar; destination ID redacted | **CAPTURED / REVIEW PENDING** | Existing sandbox webhook destination **found active** at staging URL | Replay success; fix proven |
| **DEST-01A** | [STRIPE-SANDBOX-WEBHOOK-DESTINATION-DETAILS-002.png](./STRIPE-SANDBOX-WEBHOOK-DESTINATION-DETAILS-002.png) | Same destination — **Overview** / performance panel | Confirms **Active** status and staging endpoint; signing secret **masked only** | URL bar + signing secret block redacted | **CAPTURED / REVIEW PENDING** | Destination detail corroboration | Signing secret value |
| **DEST-01B** | [STRIPE-SANDBOX-WEBHOOK-SIGNING-SECRET-MASKED-003.png](./STRIPE-SANDBOX-WEBHOOK-SIGNING-SECRET-MASKED-003.png) | Same destination — **Destination details** | **Listening to: 7 events**; API version visible; signing secret **hidden/masked** — not revealed | URL bar + signing secret section redacted | **CAPTURED / REVIEW PENDING** | Event subscription count + masked secret posture | Secret value; replay proof |

**Note:** Operator dashboard review after approval phrase `APPROVE G-02 SANDBOX WEBHOOK DESTINATION SETUP ONLY` found destination **already exists** — **Continue / Add destination / Edit destination not clicked**; **Send test events not executed**; **replay not executed**.

---

## 3. Stripe test-mode replay proof (pre-replay baseline filed; replay not executed)

| Evidence ID | Filename | Source | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|--------|----------------------|-----------|--------|--------|----------------|
| **STR-01** | [STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png](./STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png) | Stripe **Sandboxes** → Workbench → **Events** → `checkout.session.expired` | **Before** any Resend/replay: event detail; **Failed** delivery tab; staging endpoint visible; **Resend not clicked** | URL bar + event ID blocks black-barred | **CAPTURED / PRE-REPLAY BASELINE** | May 19, 2026 `checkout.session.expired` with failed delivery to staging URL **before replay** | Replay success; fix proven |
| **STR-01A** | [STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.png](./STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.png) | Same event — **Deliveries to webhook endpoints** → **Failed** | Failed delivery row to `zora-walat-api-staging…`; **Resend not clicked** | Same as STR-01 | **CAPTURED / PRE-REPLAY BASELINE** | Delivery **failed** to staging endpoint pre-replay | HTTP 200 on replay |
| **STR-01B** | [STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.png](./STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.png) | Same event — delivery attempt detail | **3 attempts** — all **Timed out** (May 19, 2026); **Resend not clicked** | URL bar black-barred | **CAPTURED / PRE-REPLAY BASELINE** | Delivery failed with **timeout attempts** before replay | Root cause confirmed; fix proven |
| **STR-02** | [STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png](./STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png) | Same path — delivery detail | **After** replay: HTTP **200** | Event IDs → `REDACTED_EVT_*` | **NOT EXECUTED / NOT CAPTURED** | — | — |

**STR-01 note:** Delivery failed with timeout attempts **before replay**. **Resend not clicked**; **replay not executed**. Exact Telegram source `…FAILED-DELIVERY-002.jpg` **not found** in UWP — STR-01A PNG derived from misnamed `…TIMEOUT-ATTEMPTS-001.jpg` (Failed tab on event detail). See [§6 Pass D](#pass-d--str-01-pre-replay-baseline-telegram-desktop-uwp-2026-05-24).

**STR-02 / LOG block reason:** Replay **not executed** — STR-02 and LOG-01…LOG-04 **NOT CAPTURED**.

---

## 4. Vercel lifecycle log proof (blocked)

| Evidence ID | Filename | Log event (search) | Capture instructions | Redaction | Status | Proves | Does not prove |
|-------------|----------|-------------------|----------------------|-----------|--------|--------|----------------|
| **LOG-01** | [VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png](./VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png) | `webhook_received` | ±15 min of STR-02 attempt | No secrets | **BLOCKED** (no replay) | — | — |
| **LOG-02** | [VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png](./VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png) | `signature_verified` | Same window | Same | **BLOCKED** (no replay) | — | — |
| **LOG-03** | [VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png](./VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png) | `event_persisted` | Same window | Same | **BLOCKED** (no replay) | — | — |
| **LOG-04** | [VERCEL-STAGING-LOG-ACK-RETURNED-001.png](./VERCEL-STAGING-LOG-ACK-RETURNED-001.png) | `ack_returned` | Same window | Same | **BLOCKED** (no replay) | — | — |
| **LOG-05** | [VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png](./VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png) | `duplicate_event_blocked` | If duplicate replay tested | Same | **BLOCKED** (no replay) | — | — |

---

## 5. Manifest completion checklist

| # | Criterion | Status |
|---|-----------|--------|
| M-01 | DEP-01 filed | **CAPTURED / REVIEW PENDING** |
| M-02 | BLK-01 filed (webhook destination blocker) | **CAPTURED / BLOCKER EVIDENCE** |
| M-03 | BLK-02 filed (no event deliveries blocker) | **CAPTURED / BLOCKER EVIDENCE** |
| M-03b | G-02 approval pack filed | **FILED** — [unblock pack](../../ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md) |
| M-03c | G-02 decision record APPROVED | **PENDING / NOT APPROVED** |
| M-03d | DEST-01 filed (existing active destination) | **CAPTURED / REVIEW PENDING** |
| M-03e | DEST-01A / DEST-01B filed | **CAPTURED / REVIEW PENDING** |
| M-04 | STR-01 filed (pre-replay baseline) | **CAPTURED / PRE-REPLAY BASELINE** |
| M-04b | STR-01A / STR-01B filed | **CAPTURED / PRE-REPLAY BASELINE** |
| M-05 | STR-02 filed | **NOT EXECUTED / NOT CAPTURED** |
| M-06 | LOG-01…LOG-04 filed (correlated window) | **NOT CAPTURED** (no replay) |
| M-07 | LOG-05 filed or N/A documented | **BLOCKED** (no replay) |
| M-08 | [FINAL_CONSERVATIVE_VERDICT.md](./FINAL_CONSERVATIVE_VERDICT.md) updated | **UPDATED** |

**Overall manifest:** **INCOMPLETE** · STR-01 pre-replay baseline **CAPTURED** · G-02 staging replay **BLOCKED / INCONCLUSIVE** (STR-02 / LOG not captured)

---

## 6. Telegram source ingestion attestation

### Pass A — batch `2026-05-23_15-51-42` (`Downloads\Telegram Desktop`)

| Source file | Classification | Target artifact | Status |
|-------------|----------------|-----------------|--------|
| `photo_1_2026-05-23_15-51-42.jpg` | Vercel `zora-walat-api-staging` Deployments — **Ready**, **main**, **`0cac02e`** | `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` | **CAPTURED / REVIEW PENDING** |
| `photo_2_2026-05-23_15-51-42.jpg` | Stripe Sandboxes → Workbench **Events** — `checkout.session.expired` — **No event deliveries found** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-NO-EVENT-DELIVERIES-001.png` | **CAPTURED / BLOCKER EVIDENCE** (URL bar redacted) |

### Pass B — BLK-01 (Telegram Desktop UWP)

**Date:** 2026-05-23
**Source:** `...\TelegramMessengerLLP.TelegramDesktop_*\LocalCache\Roaming\Telegram Desktop UWP\STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.jpg`

| Source file | Classification | Target artifact | Status |
|-------------|----------------|-----------------|--------|
| `STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.jpg` | Sandboxes → Workbench → **Webhooks** → **Create an event destination** — **Configure your event destination**; no existing staging destination | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.png` | **CAPTURED / BLOCKER EVIDENCE** (URL bar redacted) |

| Attestation | Result |
|-------------|--------|
| Telegram Desktop / UWP source reviewed | **YES** |
| Screenshots filed under canonical evidence filenames | **YES** (3 of 3 blocker/deploy captures) |
| Raw `photo_*` / source `.jpg` stored in Ap786 | **NO** (PNG only) |
| Stripe / Vercel replay or mutation executed | **NO** |
| Stripe webhook destination added (**Continue** not clicked) | **NO** |
| New destination created during this review | **NO** — existing active destination only |
| Send test events executed | **NO** |
| Production / live-money / fix-proven claim | **NO** |

### Pass C — existing active destination (Telegram Desktop UWP, 2026-05-24)

**Source folder:** `...\TelegramMessengerLLP.TelegramDesktop_*\LocalCache\Roaming\Telegram Desktop UWP\`

| Source file | Classification | Target artifact | Status |
|-------------|----------------|-----------------|--------|
| `STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.jpg` | Sandboxes → Workbench → **Webhooks** → `zora-walat-api-staging` — **Active**; staging endpoint URL visible | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.png` | **CAPTURED / REVIEW PENDING** |
| `STRIPE-SANDBOX-WEBHOOK-DESTINATION-DETAILS-002.jpg` | Destination **Overview** — **Active**; performance chart; signing secret masked | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-DETAILS-002.png` | **CAPTURED / REVIEW PENDING** |
| `STRIPE-SANDBOX-WEBHOOK-SIGNING-SECRET-MASKED-003.jpg` | **Destination details** — **Listening to: 7 events**; signing secret hidden | `STRIPE-SANDBOX-WEBHOOK-SIGNING-SECRET-MASKED-003.png` | **CAPTURED / REVIEW PENDING** |

### Pass D — STR-01 pre-replay baseline (Telegram Desktop UWP, 2026-05-24)

**Source folder:** `...\TelegramMessengerLLP.TelegramDesktop_*\LocalCache\Roaming\Telegram Desktop UWP\`

| Source file | Classification | Target artifact | Status |
|-------------|----------------|-----------------|--------|
| `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.jpg` | **NOT FOUND** at exact name | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png` | **INGESTED via misnamed source** (see next row) |
| `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-001.jpg` | Sandboxes → **Events** → `checkout.session.expired` — event detail; **Failed** delivery tab; staging endpoint; **Resend visible, not clicked** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png` + `…FAILED-DELIVERY-002.png` | **CAPTURED / PRE-REPLAY BASELINE** (URL + event ID redacted) |
| `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.jpg` | **NOT FOUND** in UWP or Downloads | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.png` | **DERIVED from misnamed 001** — Failed tab content |
| `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.jpg` | Delivery attempts — **3× Timed out** (May 19, 2026); staging endpoint; **Resend not clicked** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.png` | **CAPTURED / PRE-REPLAY BASELINE** (URL bar redacted) |

| Attestation | Result |
|-------------|--------|
| Resend clicked | **NO** |
| Replay executed | **NO** |
| Send test events executed | **NO** |
| Stripe / Vercel API calls | **NO** |
| Fix proven claim | **NO** |

---

*Manifest · STR-01 ingested 2026-05-24 · G-02 replay BLOCKED / INCONCLUSIVE · no replay executed*
