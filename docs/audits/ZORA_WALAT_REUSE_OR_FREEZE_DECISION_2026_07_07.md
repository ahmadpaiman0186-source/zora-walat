# ZORA-WALAT REUSE OR FREEZE DECISION — 2026-07-07

## 1. SAFE TO KEEP (reusable for future pivot)

| Module / path | Why |
|---------------|-----|
| `server/src/payment/*` | Idempotency, webhook truth, state machine — strong test corpus |
| `server/src/ledger/ledgerService.js` | Double-entry with immutability migrations |
| `server/handlers/slimStripeWebhook*.mjs` | Production-hardened serverless webhook path |
| `server/src/middleware/blockRestrictedCountries.js` | Compliance hook (needs legal review) |
| `server/src/domain/fulfillment/fulfillmentOutboundPolicy.js` | Fail-closed outbound gate |
| `server/prisma/schema.prisma` + migrations | Mature money schema |
| `server/test/**` | ~248 tests — primary quality asset |
| `server/tools/staging-auth-checkout-operator.mjs` | Operator harness pattern |
| `server/src/infrastructure/logging/phase1ObservabilitySanitize.js` | Secret redaction |
| Flutter `lib/features/payments/**`, `lib/features/telecom/**` | UI shell — rebrand only |
| `.github/workflows/ci.yml` | CI with Postgres + Redis |

## 2. FREEZE AS LEGACY (do not delete pre-pivot)

| Path | Why |
|------|-----|
| `Ap786/**` | Evidence chain — append-only |
| `Ap786/evidence/L85M*` | Staging DB-readonly proof marathon |
| `Ap786/evidence/L86D-production-db-readonly-proof-2026-06-23/` | Production scoped proof |
| `docs/CONTINUATION_CHECKPOINT_2026-04-*.md` | Historical context |
| `server/docs/PHASE1_*` | Phase-1 contracts |
| Dispute PR #5 artifacts (`L86F`, `L86D`) | Closed-not-merged record |
| `probe-multi-region.json` | Until explicitly removed in cleanup gate |

## 3. MUST NOT CLAIM (code/demo ≠ market truth)

| Capability | Reality |
|------------|---------|
| Global launch | **NO-GO** — all NON_CLAIMS |
| Real money / live Stripe | **NO** |
| Provider integrated (Reloadly live) | **MOCK on staging**; no OAuth proof |
| Investor ready | **NO** |
| Production ready (unqualified) | Only scoped proofs (DB-readonly, narrow webhook) |
| Compliance / licensed | **NO** — internal docs only |
| Real customers / revenue | **NOT PROVEN** |
| 65% / 68% health scores | Subjective — not launch proof |
| L-1…L-11 "all passes" without L-12/L-13 | **MISLEADING** |
| Multi-region production scale | `probe-multi-region.json` is local test output |

## 4. MUST FIX BEFORE REAL MONEY

1. Legal entity + business bank + Stripe business profile (L-90C1A chain)
2. Money-transmission counsel deliverable
3. Live Stripe activation + controlled live proof gate
4. Customer ToS/Privacy/Refund published + consent logging
5. Provider sandbox proof (OAuth + operator map) then contract
6. `PHASE1_FULFILLMENT_OUTBOUND_ENABLED` explicit governance
7. Automated refund/dispute visibility in app or documented SLA
8. KYC/AML if counsel requires

## 5. MUST FIX BEFORE PUBLIC LAUNCH

1. All CRITICAL risks in security register
2. Staffed support + incident response (not spec-only)
3. Staging + production runtime proof for critical routes
4. Sanctions external review + staging HTTP block proof
5. Remove/reword claim-heavy docs and UI copy
6. `DEV_CHECKOUT_AUTH_BYPASS` verified false everywhere public
7. Admin mutation audit trail proven in operations
8. Disaster recovery / backup restore proof

## 6. MUST REMOVE OR REWRITE

| Item | Action |
|------|--------|
| `probe-multi-region.json` (root) | Remove or move to `Ap786/evidence/` with label |
| `Ap786/AP786_ALL_PASSES_INVESTOR_PROOF.md` | Reword or archive with NON_CLAIMS banner |
| `softLaunchAdmin.routes.js` orphan | Mount behind auth or delete in dedicated PR |
| `lib/l10n/app_localizations_en.dart` "global minutes" | Replace with non-market claim copy |
| `server/docs/LAUNCH_READINESS.md` title/body | Scope to engineering checklist only |
| Duplicate payment route mounts | Document single canonical path |

## 7. GO / NO-GO SUMMARY

| Dimension | Verdict | Basis |
|-----------|---------|-------|
| Engineering readiness | **CONDITIONAL GO** | Strong code + tests; CI not re-run locally |
| Security readiness | **NO-GO** | Admin surfaces, auth bypass name on staging, no prod pen test |
| Payment readiness | **NO-GO** | Sandbox narrow proof only; no real money |
| Provider readiness | **NO-GO** | Mock runtime; Reloadly blocked |
| Compliance readiness | **NO-GO** | No entity, legal docs, sanctions review |
| Market readiness | **NO-GO** | No customers/revenue proof |
| Investor readiness | **NO-GO** | Explicit program lock |

**Overall pivot reuse verdict:** **CONDITIONAL GO** for **engineering asset reuse** under strict freeze/claim boundaries — **NO-GO** for **business launch or investment claims**.

---

*Decision matrix only. No code changes performed.*
