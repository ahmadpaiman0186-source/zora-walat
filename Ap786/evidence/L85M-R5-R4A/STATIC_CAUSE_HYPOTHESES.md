# L-85M-R5-R4A — Static cause hypotheses

**Gate UTC:** 2026-06-21

---

## Required phase answers

| Question | Static answer |
|----------|---------------|
| Before Express app initialization? | **NO** for auth gate — pre-bootstrap completed |
| During `getExpressHandler` / import / bootstrap? | **PLAUSIBLE — PRIMARY** |
| During route registration (`createApp`)? | **PLAUSIBLE** — part of same cold path |
| During DB client import? | **PLAUSIBLE** — owner Prisma loads via `ops.routes.js` import graph |
| Inside ops proof handler controlled path? | **UNLIKELY** — would return `dbReadonlyProofContract` JSON, not bridge classification |

## Source-level mismatch explaining 401 pre-bootstrap vs pass-through throw

| Mismatch | Effect |
|----------|--------|
| Pre-bootstrap uses lightweight guard modules only | Missing/invalid token → **401 JSON** without Express |
| Pass-through loads `bootstrap.js` + full `createValidatedApp()` | Any **throw** on cold path → R5-R3F **503** `PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION` |
| Root bridge skips `registerServerlessRuntime.js` | Documented production gate expects `ZW_RUNTIME_KIND=serverless` on serverless entries (`server/api/index.mjs` sets it; root bridge does not) |
| Pre-bootstrap token read vs Express token read | Different config paths (`process.env` vs `env.js`); misalignment typically yields **401** from proof service, not bridge exception — **less likely** given R5-R4 passed pre-bootstrap |

## Ranked hypotheses (static only)

| Rank | Hypothesis | Confidence |
|------|------------|------------|
| 1 | **Unhandled throw during authenticated pass-through cold start** — `getExpressHandler()` (`bootstrap.js` await chain, `createValidatedApp()`, Express import graph, or `serverless-http` dispatch) | **HIGH** (fits R5-R3/R5-R4 chain + boundary classification) |
| 2 | **Root bridge missing `registerServerlessRuntime`** — production runtime-kind / bootstrap parity gap vs `server/api/index.mjs` | **MEDIUM** (clear static mismatch; interaction with observed `catch` envelope not fully provable without logs/env) |
| 3 | **Owner Prisma / heavy route import graph initialization** during `createApp()` before proof handler runs | **MEDIUM** |
| 4 | **Throw inside proof handler outside service try/catch** (e.g. middleware / response edge) | **LOW–MEDIUM** |
| 5 | Missing route / rewrite / handler file | **LOW** (contradicted by R5-R4 `X-Matched-Path` + static map) |
| 6 | Exact exception class (module name, stack frame) | **INCONCLUSIVE** (R5-R3B logs insufficient) |

## Classification rationale

**`RUNTIME_EXCEPTION_SOURCE_TRIAGE_CAUSE_PARTIALLY_IDENTIFIED`**

- **Identified:** failure phase (authenticated pass-through, not pre-bootstrap); bridge catch site; controlled proof handler unlikely source.
- **Partial:** exact throw site within cold-start vs dispatch; exception class; whether `registerServerlessRuntime` omission is primary trigger.

---

*End.*
