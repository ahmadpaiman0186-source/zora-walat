# L-86D — Next gate recommendation

---

## Recommended next gate: **L-86E**

**Type:** Separately operator-authorized implementation + test rebuild (optional defer)

### L-86E entry criteria (suggested)

| Criterion | Required? |
|-----------|-----------|
| Operator authorization for L-86E | **YES** |
| Explicit contract choice (503 pre-tx vs graceful in-tx) | **YES** |
| L-86D merged to `main` | **YES** (evidence chain) |
| L-85M PASS | **NO** for unit/HTTP local tests; **YES** before staging money-path proof claims |
| PR #5 merge | **NO** — forbidden |

### L-86E scope options

| Scope | Description |
|-------|-------------|
| **Minimal (recommended first)** | Rebuild dispute HTTP tests only on `main` per chosen contract; no production behavior change if Option B |
| **Full PR #5 contract** | Port pre-tx resolver + 503 route + stripe test override + both tests — **runtime change** |
| **Defer** | No L-86E until L-85Y+ route exposure + L-85M retry chain advances |

### L-86E non-scope

- Merge/close PR #5 (separate gate after L-86E evidence)
- Deploy/redeploy without explicit deploy gate
- Global compliance / provider / market claims

### PR #5 until L-86E completes

**KEEP_OPEN_BLOCKED** — unchanged from L-86C.

---

*End.*
