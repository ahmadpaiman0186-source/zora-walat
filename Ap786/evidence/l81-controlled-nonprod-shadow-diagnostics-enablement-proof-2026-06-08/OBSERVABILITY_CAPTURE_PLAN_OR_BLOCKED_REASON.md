# L-81 — Observability capture plan or blocked reason

## Target observability

Capture `shadow_safety_gate_webhook_diagnostic` log line with L-80 sanitized `envelope` object in **non-prod runtime logs** (e.g. Vercel staging log drain).

## Blocker 1 — Env/deploy mutation (Case 2)

**Required:** Set staging env var `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED=true` and redeploy/restart staging API.

**L-81 approval:** Does **not** authorize production mutation; staging env change is deploy-scoped mutation.

**Status:** **NOT EXECUTED** — file as sub-blocker under explicit env/deploy approval gate.

## Blocker 2 — No safe webhook trigger (Case 3)

Even with flag ON, envelope emits only when `stripeWebhook.routes.js` post-commit path runs with `req.log.info` — i.e. after a **real inbound Stripe webhook** that passes signature verification and order commit logic.

**Safe alternatives under L-81:** None in repo without:
- Stripe replay/resend (**forbidden**)
- Payment/checkout (**forbidden**)
- Integration test hitting real DB (**forbidden**)

**Status:** **BLOCKED_AWAITING_SAFE_NONPROD_OBSERVABILITY_PATH**

## What L-81 did capture (local partial only)

- 73/73 unit tests pass including enabled-flag envelope emission in memory
- No staging log lines captured
- No Datadog/Vercel log export attached

## Future proof boundary (when separately approved)

1. Explicit **staging-only env/deploy approval** for flag ON (never production)
2. Separate approval for **controlled synthetic webhook inject** or operator-approved non-replay test harness wired to staging — must not use Stripe replay, payment, or DB mutation unless explicitly approved
3. Redacted log capture artifact showing envelope fields only (no raw payload)

---

*End.*
