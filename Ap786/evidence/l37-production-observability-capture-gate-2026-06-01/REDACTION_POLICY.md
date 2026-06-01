# L-37 — Required redaction policy

**Date:** 2026-06-01
**Gate:** CORE10-L37-CAPTURE-GATE-001

---

## Forbidden in any filed artifact

| Class | Rule |
|-------|------|
| Tokens | **Never** include API tokens, session tokens, JWT, bearer strings |
| Secrets | **Never** include API keys, webhook signing secrets, provider secrets |
| Env values | **Never** screenshot or paste `.env`, Vercel env panels, or variable values |
| Passwords | **Never** include operator or customer passwords |
| Private customer PII | **Remove** email, phone, full name, address |
| Full payment IDs | **Suffix only** (last 8–10 chars) if ID reference required |
| Full provider transaction IDs | **Suffix only** or omit |
| Webhook secrets | **Never** include signing secret or raw webhook body |
| Private keys | **Never** include PEM, SSH, or signing keys |
| Unredacted production credentials | **Never** — abort capture if visible |

---

## Screenshot-specific rules

| Panel type | Action |
|------------|--------|
| Vercel Environment Variables | **Do not capture** — abort if required for proof |
| Stripe dashboard raw payload | **Enum + event_type only** in logs; no body secrets |
| Neon / DB connection strings | **Never** |
| Browser devtools Network tab with auth headers | **Never** |

---

## Filename convention

`{OBS-ID}-2026-06-01-redacted.png` (or `.pdf`, `.jsonl` with `-redacted` suffix)

---

## Verification (reviewer)

Before marking a row **FILED**:

1. Visual scan for secret-like strings (high entropy, `sk_`, `whsec_`, `Bearer`)
2. Confirm production hostname/project in frame
3. Confirm no full customer or payment identifiers
4. If any doubt → **reject** and file abort note per [ABORT_RULES.md](./ABORT_RULES.md)

---

*Redaction policy is mandatory; policy filing alone is not proof.*
