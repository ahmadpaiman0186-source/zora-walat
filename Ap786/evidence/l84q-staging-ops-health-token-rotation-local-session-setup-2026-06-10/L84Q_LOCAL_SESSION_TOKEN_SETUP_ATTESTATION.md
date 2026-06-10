# L-84Q — Local session token setup attestation

**Verdict:** `CORE10-L84Q-VERDICT-002: L84Q_TOKEN_ROTATION_BLOCKED_NO_SECRET_REVEAL`

## Local session setup (name-only)

| Field | Attestation |
|-------|-------------|
| Local env var name | **`ZW_OPS_HEALTH_TOKEN`** |
| New token generated | **YES** |
| Token printed | **NO** |
| Token echoed | **NO** |
| Token length disclosed | **NO** |
| Token prefix/suffix/hash | **NO** |
| `$env:ZW_OPS_HEALTH_TOKEN` temporarily set | **YES** |
| Local generated token discarded (final) | **YES** |
| Token available for L-84P retry after L-84Q | **NO** |

## Final state

The locally generated token was **discarded**. No local operator token remains from L-84Q for HTTP retry without a **separate** authorized rotation/setup gate.

---

*End.*
