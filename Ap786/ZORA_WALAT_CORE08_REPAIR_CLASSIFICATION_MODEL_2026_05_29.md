# CORE-08 Repair Classification Model

**Date:** 2026-05-29  
**Aligns with:** [CORE-03 self-repair classes](./ZORA_WALAT_CORE03_SELF_REPAIR_CLASSIFICATION_MODEL_2026_05_29.md)

---

## Class codes

| Code | CORE-03 | Auto-apply in CORE-08 |
|------|---------|------------------------|
| `A_DETECT_ONLY` | A | **Never** |
| `B_METADATA_CANDIDATE` | B | **Never** (candidate only) |
| `C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER` | C | **Never** (plan + phrase only) |
| `D_FORBIDDEN` | D | **Never** |

---

## Signal → class mapping

| Signal | Class | Approval |
|--------|-------|----------|
| Missing audit metadata | B | No |
| Stale pending review flag | B | No |
| Payment succeeded / provider missing | C | Yes |
| Provider timeout / ambiguous | C | Yes |
| Provider retry (safe classify) | C | Yes |
| Provider retry after ambiguous | D | Yes (separate DR) |
| Duplicate provider execution risk | D | Yes |
| Missing idempotency key | D | No auto-repair |
| Completed without provider proof | C | Yes |
| Refund candidate | C | Yes |
| Wallet correction candidate | C | Yes |
| Clean (no signals) | — | No plans |

---

## Approval phrase (Class C plans)

```
APPROVE CORE-08 SAFE REPAIR APPLY ONLY
```

**Note:** Phrase authorizes **future** apply workflow outside CORE-08 v1 — **apply is NOT implemented**.

---

*End of classification model.*
