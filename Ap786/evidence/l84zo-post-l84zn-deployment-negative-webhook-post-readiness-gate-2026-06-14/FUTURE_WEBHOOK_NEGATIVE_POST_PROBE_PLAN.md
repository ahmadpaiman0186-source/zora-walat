# L-84ZO — Future webhook negative POST probe plan

**Status:** **PREPARED — NOT EXECUTED**

**Prerequisite before W1/W2:** Prove staging root deployment commit includes L-84ZN (`b4691b9` / `496b2b6`) via Vercel UI or deployment API.

## Base

```
https://zora-walat-api-staging.vercel.app
```

## Probes (operator approval required — separate gate)

| ID | Method | Path | Body | Headers | Expected |
|----|--------|------|------|---------|----------|
| **W1** | POST | `/api/webhooks/stripe` | `{}` | none | **400** or controlled **4xx**; no **2xx**/**5xx**; no secrets; no payment/session/customer IDs in body |
| **W2** | POST | `/webhooks/stripe` | `{}` | none | Same as W1 (rewrite to bridge) |

## Expected later pass criteria

- Controlled **400** / **4xx**
- No audit DB write before signature (L-84ZN behavior — verify via DB read-only or audit row count if approved)
- No payment/provider/session/checkout/customer IDs in response
- No **2xx**, no **5xx**, no timeout
- No secrets in response body

## PowerShell sketch (do not run in L-84ZO)

```powershell
$base = "https://zora-walat-api-staging.vercel.app"
# W1 — POST /api/webhooks/stripe — NOT EXECUTED
# W2 — POST /webhooks/stripe — NOT EXECUTED
```

---

*End.*
