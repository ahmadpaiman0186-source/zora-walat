# L-84ZW — Local test results

**Gate UTC:** 2026-06-15  
**Runtime POST:** **NOT EXECUTED**  
**External Stripe/provider:** **NOT CONTACTED** (mocked hooks only)

## Command pattern

```text
node --import ./test/setupTestEnv.mjs --test --test-force-exit --test-concurrency=1 <test-file>
```

## Scoped gate tests (required)

| Test file | Pass | Fail | Notes |
|-----------|------|------|-------|
| `test/slimCreateCheckoutEntrypoint.test.js` | **4** | **0** | 401/415/mocked success; index routing |
| `test/l84zmLocalMutationBoundaryProof.test.js` | **2** | **0** | 401 no bearer; login validation |
| `test/slimStripeWebhookEntrypoint.test.js` | **12** | **0** | Webhook boundary unchanged |
| **Subtotal** | **18** | **0** | |

## L-84ZW bridge tests (added)

| Test file | Pass | Fail | Notes |
|-----------|------|------|-------|
| `test/rootCreateCheckoutBridge.test.js` | **5** | **0** | Rewrite declared; 405 GET; **401** no Bearer; 415 Bearer+plain; mocked 200 |
| `test/rootVercelWebhookBridge.test.js` | **5** | **0** | Rewrites include checkout; webhook unchanged |
| **Subtotal** | **10** | **0** | |

## Total

| | Pass | Fail |
|---|------|------|
| **All suites** | **28** | **0** |

All commands exited **0**.

## What local tests prove (bounded)

- Root bridge file exists and declares checkout rewrite
- Bridge returns **401 JSON** without Bearer without invoking checkout orchestration
- Bridge delegates Bearer requests to `handleSlimCreateCheckoutPost`
- Existing slim checkout and webhook tests still pass

## What local tests do NOT prove

- Staging runtime behavior after redeploy
- L-84ZV C1–C4 re-probe outcomes
- Production DB zero-write

---

*End.*
