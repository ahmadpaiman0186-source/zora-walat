# L-85K — Test evidence

**Requirement:** Tests must not require live Neon or read `.env.local`.

---

## 1) Test command

```text
npm --prefix server run test:db-readonly-proof
```

Equivalent:

```text
node --test --test-concurrency=1 test/dbReadonlyProof.test.js
```

---

## 2) Test coverage

| Test area | File | Live DB |
|-----------|------|---------|
| Missing token → BLOCKED | `dbReadonlyProof.test.js` | **NO** |
| Invalid token → BLOCKED | `dbReadonlyProof.test.js` | **NO** |
| Missing READ_ONLY_DATABASE_URL → BLOCKED | `dbReadonlyProof.test.js` | **NO** |
| Probe injection (no owner fallback) | `dbReadonlyProof.test.js` | **NO** |
| resolveReadonlyDatabaseUrl isolation | `dbReadonlyProof.test.js` | **NO** |
| Verdict PASS/FAIL logic | `dbReadonlyProof.test.js` | **NO** |
| Static: no owner db.js / DATABASE_URL in service | `dbReadonlyProof.test.js` | **NO** |
| Route wiring without owner prisma in route block | `dbReadonlyProof.test.js` | **NO** |
| HTTP route (subprocess child) | `helpers/dbReadonlyProofRouteChild.test.js` | **NO** |
| No secret-like values in response JSON | `dbReadonlyProof.test.js` | **NO** |
| Safe fixed invariant fields | both files | **NO** |
| No row export fields in response | `dbReadonlyProof.test.js` | **NO** |

---

## 3) Test techniques

| Technique | Usage |
|-----------|-------|
| Injected `runProbe` mock | Avoids DB connect for PASS path |
| Injected `getReadonlyUrl` | Controls URL without env files |
| Injected `isOpsHealthTokenConfigured` | Unit auth without env reload |
| Subprocess child route test | `OPS_HEALTH_TOKEN` set before app module load |
| Static source review | Import boundary enforcement |

---

## 4) Result (L-85K filing)

| Metric | Value |
|--------|-------|
| Command | `npm run test:db-readonly-proof` |
| Result | **PASS** (10 tests, 0 failures after route static fix) |
| Live Neon | **NOT USED** |
| `.env.local` read | **NO** |

---

*End.*
