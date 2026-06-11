# L-84T — Vercel OPS token recovery sequence

**Verdict:** `CORE10-L84T-VERDICT-001: L84T_STRIPE_ROTATION_PLAN_ONLY_EXECUTION_NOT_AUTHORIZED`

## Problem statement (from L-84R / L-84S)

| Field | Status |
|-------|--------|
| Project | **`zora-walat-api-staging`** |
| Env var | **`OPS_HEALTH_TOKEN`** |
| Scope | **Production** |
| Issue | Wrong **`sk_live...`-like** pattern observed in UI edit field |
| L-84R save today | **NO** |
| Clean ops token in Vercel | **NOT PROVEN** |

## Planned recovery sequence (future gate — not L-84T)

**Target lock:** **`zora-walat-api-staging`** only. **Forbidden:** `zora-walat-api`, `zora-walat`, `zora-walat-mj41`.

### Step 1 — Pre-save verification (operator)

1. Open Vercel → **`zora-walat-api-staging`** → Settings → Environment Variables.
2. Locate **`OPS_HEALTH_TOKEN`** (Production, Sensitive ON).
3. **Do not click reveal/eye.** If edit field shows **`sk_live...`-like** pattern → **STOP** — do not save; file abort evidence.
4. Confirm intent: replace with **new CSPRNG ops token** (not Stripe key, not webhook secret).

### Step 2 — Generate ops token (future authorized gate)

1. Generate 48-byte CSPRNG token locally — **value not printed**.
2. Set local **`ZW_OPS_HEALTH_TOKEN`** temporarily — value hidden.
3. Copy to clipboard — value not printed.

### Step 3 — Vercel UI save (operator-only)

1. Update/replace **`OPS_HEALTH_TOKEN`** value via Vercel UI.
2. Scope: **Production**. Sensitive: **ON**.
3. Paste from clipboard. Save.
4. **Do not** paste Stripe keys into this field.

### Step 4 — Post-save cleanup (operator)

1. Clear clipboard: `CLIPBOARD_CLEARED_NO_SECRET`.
2. Discard local generated token from session unless L-84P gate explicitly requires retention (separate approval).

### Step 5 — Proof gate (future)

File Ap786 evidence: save confirmed YES, secret material NO, redeploy status, no HTTP unless authorized.

## Sequencing relative to Stripe rotation

| Order | Recommendation |
|-------|----------------|
| Stripe live key rotation (Track A) | May proceed **in parallel** if different env vars — **must not** use **`OPS_HEALTH_TOKEN`** slot |
| OPS token recovery (this sequence) | **Required** before L-84P retry |
| Redeploy | **After** clean OPS token save — separate gate |
| L-84P HTTP | **After** redeploy + local token alignment — separate gate |

## L-84T boundary

**Plan only.** No Vercel edit, save, delete, or CLI in L-84T.

---

*End.*
