# L-85M-R5-R4F — Serverless runtime parity fix

**Gate UTC:** 2026-06-21

---

## Problem (static, from R5-R4A)

Root bridge `api/ops/db-readonly-proof.mjs` omitted `registerServerlessRuntime.js` that `server/api/index.mjs` imports first, leaving `ZW_RUNTIME_KIND` **UNSPECIFIED** during `createValidatedApp()` on authenticated pass-through cold start in production.

## Fix applied

Top-level import added (module load, before any handler/bootstrap path):

```javascript
import '../../server/src/runtime/registerServerlessRuntime.js';
```

`registerServerlessRuntime.js` sets `process.env.ZW_RUNTIME_KIND = 'serverless'`.

## Parity reference

| Entry | Registers serverless runtime |
|-------|------------------------------|
| `server/api/index.mjs` L6 | **YES** |
| `api/ops/db-readonly-proof.mjs` (post-fix) | **YES** |

## Runtime proof claim

**NOT MADE** — local static + handler tests only; staging authenticated proof retry is a separate authorized gate after deploy pickup.

---

*End.*
