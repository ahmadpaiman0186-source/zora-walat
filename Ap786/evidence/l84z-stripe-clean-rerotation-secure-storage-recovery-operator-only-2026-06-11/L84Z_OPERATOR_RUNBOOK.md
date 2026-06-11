# L-84Z — Operator runbook

**Status:** **AUTHORIZED — OPERATOR EXECUTION PENDING**

**Do not paste any secret into chat, Cursor, GitHub, or Ap786 evidence.**

## Preconditions

1. L-84Z authorization received (this gate).
2. Operator understands [L-84Y abort reason](../../ZORA_WALAT_L84Y_VERCEL_STRIPE_SECRET_KEY_UPDATE_BLOCKED_DPAPI_INVALID_2026_06_11.md): prior DPAPI blob unusable.
3. **Do not open Vercel** for `STRIPE_SECRET_KEY` update in this gate.

## Step A — Decide re-rotation

| Situation | Operator action |
|-----------|-----------------|
| Prior L-84X secret cannot be retrieved safely | **Re-rotate** — create fresh live secret in Stripe Dashboard |
| Operator uncertain secret is complete/correct | **Re-rotate** — fail-closed |
| Operator has verified full secret in new reliable storage | May skip re-rotation **only if** validation PASS on existing secret |

Default when in doubt: **re-rotate**.

## Step B — Stripe Dashboard (operator only)

1. Log in to **correct Stripe account**.
2. Confirm **Live mode**.
3. Developers → API keys.
4. Roll/create **live secret key** as needed.
5. Copy new secret to clipboard — **do not paste into chat/evidence**.

## Step C — Secure storage (operator only)

1. Choose storage **outside** chat, Cursor, GitHub, and repo.
2. Store **full** new secret using a method operator trusts.
3. **Avoid repeating L-84Y failure:** if using DPAPI or encrypted files, verify format/write procedure **before** closing Dashboard session.
4. Do **not** create plaintext secret files inside repo or synced folders.

## Step D — Storage validation (operator only, non-secret)

1. Perform a **read/write round-trip check** using operator tooling only.
2. Confirm retrieved value matches what was stored (operator eyeball only — **do not paste into chat**).
3. Record outcome for attestation: **`PASS`** or **`FAIL`** / **`BLOCKED`** only.
4. If **FAIL** or **BLOCKED**: abort L-84Z → candidate `CORE10-L84Z-VERDICT-002`.

## Step E — Cleanup

1. Clear clipboard: e.g. `Set-Clipboard -Value "CLIPBOARD_CLEARED_NO_SECRET"`.
2. Close Stripe Dashboard secret view.
3. Provide **non-secret attestation** to Agent using [L84Z_OPERATOR_ATTESTATION_TEMPLATE.md](./L84Z_OPERATOR_ATTESTATION_TEMPLATE.md).

## Step F — Agent finalizes evidence

Agent updates Ap786 with operator YES/NO attestation only. **No secret material.**

## Explicitly out of scope

- Vercel `STRIPE_SECRET_KEY` update
- Redeploy
- HTTP / L-84P
- `OPS_HEALTH_TOKEN` recovery

---

*End.*
