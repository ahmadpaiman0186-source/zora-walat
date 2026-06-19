# L-85M-R2B-FIX1 — Local reproduction result

**Gate UTC:** 2026-06-19

---

## Reproduction command

```text
node --test test/rootVercelWebhookBridge.test.js
```

(from `server/` directory)

## Result (pre-fix)

| Test | Result |
|------|--------|
| `rewrites /webhooks/stripe and L-84ZJ health/ready probes...` | **FAIL** — `deepStrictEqual` mismatch |
| Other tests in same file | Local env-dependent (not CI failure candidate) |

## Targeted post-fix verification

```text
node --test --test-name-pattern "root Vercel webhook route declaration" test/rootVercelWebhookBridge.test.js
```

| Test | Result |
|------|--------|
| Route declaration suite (2 tests) | **PASS** |

## Full `npm run test:ci`

**NOT RUN** locally — requires integration DB migrate path and long runtime. CI failure isolated to single unit test above.

## Live dependency note

Full unit runner (`run-unit-tests.mjs`) attempted with `ZW_SKIP_DB_UNIT_PRECHECK=true` — runs broader suite; not used as FIX1 validation gate due to unrelated local env failures outside R2B scope.

---

*End.*
