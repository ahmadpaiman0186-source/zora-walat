# L-39 — Redaction policy

**Date:** 2026-06-02
**Gate:** CORE10-L39-CAPTURE-GATE-001

---

## Forbidden in any filed artifact

| Class | Rule |
|-------|------|
| Tokens | **Never** |
| Secrets / API keys | **Never** |
| Env values | **Never** — no Vercel/Stripe env panels |
| Passwords | **Never** |
| Private customer PII | **Remove** |
| Full payment IDs | **Suffix only** or omit |
| Full provider transaction IDs | **Suffix only** or omit |
| Webhook secrets (`whsec_*`) | **Never** |
| Private keys | **Never** |
| Unredacted production credentials | **Never** |

---

## Alert/channel screenshots

| Element | Rule |
|---------|------|
| Webhook URL | **Redact** or crop |
| Slack/PagerDuty integration token | **Never** visible |
| Personal email/phone in on-call | **Redact** — role label ok |

---

## Logs / money-path screenshots

| Element | Rule |
|---------|------|
| Raw Stripe webhook JSON | **Forbidden** |
| JWT / session | **Forbidden** |
| Full order ID | **Suffix only** |

---

*Policy filing ≠ redaction verified — verification occurs at future intake only.*
