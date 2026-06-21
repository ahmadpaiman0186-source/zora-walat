# L-85M-R5-R4F — Test results

**Gate UTC:** 2026-06-21

---

## Command

```text
cd server
node --test --test-concurrency=1 test/rootVercelDbReadonlyProofBridge.test.js
```

## Result

| Metric | Value |
|--------|--------|
| Tests | **5** |
| Pass | **5** |
| Fail | **0** |
| Duration | ~195 ms |

## Cases

| Test | Result |
|------|--------|
| Fail-closed error boundary static review | **PASS** |
| Serverless runtime parity static review (R5-R4F) | **PASS** |
| Unsupported methods → 405 | **PASS** |
| Unauthenticated pre-bootstrap 401 | **PASS** |
| Authenticated pass-through throw → sanitized 503 | **PASS** |

Full server suite | **NOT RUN** (bounded gate scope).

---

*End.*
