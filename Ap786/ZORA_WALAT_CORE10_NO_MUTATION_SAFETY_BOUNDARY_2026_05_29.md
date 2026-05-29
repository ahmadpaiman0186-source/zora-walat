# CORE-10 No-Mutation Safety Boundary

**Date:** 2026-05-29  
**Applies to:** All future CORE-10 staging snapshot and observability work

---

## 1. Hard prohibitions

| # | Prohibited action |
|---|-------------------|
| 1 | DB **write** (INSERT/UPDATE/DELETE/migrate) |
| 2 | Provider API **call** (Reloadly POST, etc.) |
| 3 | Payment **mutation** (capture, refund, void) |
| 4 | Wallet **mutation** |
| 5 | Order **mutation** (status change via ops script unless separate DR) |
| 6 | **Refund** execution |
| 7 | Webhook **replay** / **resend** |
| 8 | **Deploy** or production config change |
| 9 | **Auto-repair apply** (CORE-08 `--apply` forbidden) |
| 10 | **Secret exposure** in evidence filings |

---

## 2. Allowed (after capture approval only)

| Action | Constraint |
|--------|------------|
| Read-only DB SELECT / export | Staging only; logged |
| Offline `zw-doctor reliability --fixture` | Redacted JSON only |
| Offline CORE-05/06/08 classify | No live I/O |
| Redacted log excerpt filing | No tokens/PII |
| Evidence matrix update | Ap786 / evidence folder |

---

## 3. Redaction (mandatory)

| Data class | Treatment |
|------------|-----------|
| API keys / secrets | **Omit** |
| JWT / session tokens | **Omit** |
| Customer email / phone / MSISDN | Hash or omit |
| Full Stripe/Checkout URLs | Truncate / omit query params |
| Webhook signing secrets | **Omit** |
| Raw webhook bodies | **Omit** — metadata only |

Evidence: **CORE10-EV-SNAPSHOT-REDACT-001**.

---

## 4. Runtime Doctor boundary

| Mode | Allowed in CORE-10 staging proof |
|------|----------------------------------|
| `npm run test:runtime-doctor` | Local fixtures only (already done) |
| `zw-doctor reliability --fixture` | Redacted export only |
| Doctor with live DB connection | **NOT AUTHORIZED** in CORE-10 v1 |

---

## 5. zw-doctor flags

| Flag | Result |
|------|--------|
| `--apply` | **Exit 2** — forbidden |
| `--fixture` | Required for reliability mode |

---

## 6. Conservative verdict

Safety boundary **filed only**. No staging session executed. **NO-GO** for production / pilot / real-money.

---

*End of safety boundary.*
