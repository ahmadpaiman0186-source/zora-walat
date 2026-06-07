# L-80 — Default behavior no-op review

| Case | Envelope emitted | Fulfillment dispatch |
|------|------------------|----------------------|
| Flag absent | **no** | **unchanged** |
| Flag `false` | **no** | **unchanged** |
| Flag `true` | sanitized envelope in log only | **unchanged** |

L-80 changes log shape when flag enabled; does not change hook early-return when disabled.

---

*End.*
