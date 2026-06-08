# L-83A — Test results (local)

**Date:** 2026-06-08

| Command | Exit | Result |
|---------|------|--------|
| `npm --prefix server run test:shadow-safety-gate-staging-probe` | 0 | **13/13 pass** |
| `npm --prefix server run test:shadow-safety-diagnostics-envelope` | 0 | **13/13 pass** |
| `npm --prefix server run test:shadow-safety-gate-boundary` | 0 | **11/11 pass** |
| `npm --prefix server run test:no-pay-no-service` | 0 | **17/17 pass** |
| `npm --prefix server run secrets:scan` | 0 | **OK** |
| `git diff --check` | 0 | **PASS** |

## Staging probe test coverage

- Gate resolver fail-closed (flag off, tier not staging)
- Adapter emits one log line with sanitized envelope
- Static import boundary scan (adapter + route sources)
- Route HTTP: 200 success, 404 gates off, 401 no token, 400 body, 404 production tier

**No staging HTTP executed.**

---

*End.*
