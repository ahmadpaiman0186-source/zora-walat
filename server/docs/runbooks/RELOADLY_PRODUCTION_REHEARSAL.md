# Reloadly — production rehearsal (operator runbook)

This is a **truthful** rehearsal guide. It does not certify Reloadly or carrier behavior; it aligns operators with what this **repository** already validates and how to move from sandbox toward production **safely**.

## 1. Boundary: sandbox vs production API

| Env | Meaning in this codebase |
|-----|---------------------------|
| **`RELOADLY_SANDBOX=true`** | Topups/auth URLs default to Reloadly **sandbox** hosts; use **test** dashboard credentials. |
| **`RELOADLY_SANDBOX=false`** | Production Reloadly audience; **live** credentials and **real money** at provider — requires explicit org approval. |

**Rule:** Rehearse only in sandbox until finance + ops sign off on production keys and caps.

## 2. Static preflight (no HTTP to Reloadly)

From `server/`:

```bash
npm run reloadly:sandbox-readiness
```

This reports env **presence** (not secret values): client id/secret, sandbox flag, `AIRTIME_PROVIDER`, operator map JSON, and minimal pipeline vars (DB, Stripe, JWT) for webhook-driven attempts.

For a shorter **production-oriented** checklist (same script today — extend env later if needed), use the same command and interpret “NOT READY” lines as blockers.

## 3. Operator map (hard prerequisite)

- **`RELOADLY_OPERATOR_MAP_JSON`** maps **internal** `operatorKey` (catalog) → **numeric** Reloadly operator id.
- Unmapped routes **fail before** provider HTTP — this is intentional (no silent wrong operator).

**Rehearsal step:** For each operator you sell in production, confirm a mapping exists and matches Reloadly’s **current** operator list for your account mode (sandbox vs live).

## 4. Airtime vs web top-up

- **Phase 1 airtime** path uses `AIRTIME_PROVIDER=reloadly` and the airtime adapter stack (see startup logs: `provider_config_validated`).
- **Web top-up** uses `WEBTOPUP_FULFILLMENT_PROVIDER` — can also be `reloadly`. Rehearsal must target **the path you enable in production**, not a different adapter.

## 5. Timeouts, retries, ambiguity

- Configurable timeouts and circuit behavior are documented in **`server/.env.example`** (e.g. `AIRTIME_PROVIDER_TIMEOUT_MS`, Reloadly circuit keys).
- **Ambiguous provider outcomes** may land orders in **verifying / manual review** states — see `docs/PHASE1_STATE_MACHINE.md` and reconciliation docs. Rehearsal should include one **forced failure** drill (mock or sandbox) and confirm ops can find the order in admin/DB tools.

## 6. Rollback / escalation

- **No automatic “un-send” airtime** in customer wallets when provider succeeds — disputes are **financial / support** processes.
- **Stripe refunds / disputes** are modeled in webhook handlers — see `docs/PHASE1_REFUND_AND_DISPUTE.md`.
- Escalation: use structured logs + `orderId` + Stripe `payment_intent` / provider reference suffix from **`GET /api/transactions/:id`** (`trustStatusKey`, `providerReferenceSuffix`).

## 7. Strongest automated proof available in-repo

1. `npm run reloadly:sandbox-readiness` — static env gates.  
2. `npm run webtopup:sandbox-verify` (when web top-up path is in scope) — see script header.  
3. Integration / fortress tests with **`TEST_DATABASE_URL`** + Reloadly sandbox (optional; may incur API noise).  
4. **Bounded manual drill:** [RELOADLY_SANDBOX_GOLDEN_PATH.md](./RELOADLY_SANDBOX_GOLDEN_PATH.md) — one SKU, explicit pass/fail.

**Live** production rehearsal still requires **controlled** real keys, low caps, and a documented **go/no-go** owner.
