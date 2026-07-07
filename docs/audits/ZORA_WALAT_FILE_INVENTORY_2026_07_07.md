# ZORA-WALAT FILE INVENTORY — 2026-07-07

## Repository scale (tracked)

| Area | Tracked files (`git ls-files`) |
|------|------------------------------|
| **Total** | 3,748 |
| `server/` | 997 |
| `Ap786/` | 2,358 |
| `*.dart` (Flutter) | 145 |

## Package managers and lockfiles

| Path | Role |
|------|------|
| `server/package.json` | API server — authoritative backend |
| `server/package-lock.json` | Server npm lock |
| `package.json` (root) | Next.js / monorepo wrapper |
| `pubspec.yaml` | Flutter client |

## Top-level layout

| Path | Classification | Notes |
|------|----------------|-------|
| `server/` | **KEEP** — core API | Express + Prisma + Vercel serverless |
| `lib/`, `test/` | **KEEP** — Flutter client | Phase-1 money surface UI |
| `api/` (root) | **KEEP** — deploy bridges | Next/Vercel rewrites to slim handlers |
| `Ap786/` | **FREEZE** — evidence/governance | Not deploy root; 2,358 tracked files |
| `docs/` | **MIXED** | April checkpoints + ops reports; superseded risk |
| `topup/` | **REVIEW** | Shared compliance TS |
| `packages/flutter_stripe_web/` | **KEEP** | Stripe web bridge |
| `probe-multi-region.json` | **FREEZE / REMOVE LATER** | Apr 2026 local probe output at repo root — not evidence |

## Server code hotspots (money path)

| Path | Purpose |
|------|---------|
| `server/src/app.js` | Express mount graph |
| `server/api/index.mjs` | Vercel catch-all + slim fast paths |
| `server/handlers/slim*.mjs` | Serverless-optimized handlers |
| `server/prisma/schema.prisma` | 33 models, PostgreSQL |
| `server/prisma/migrations/` | 41 migrations |
| `server/test/` | ~248 `*.test.js` unit/integration |
| `server/tools/staging-auth-checkout-operator.mjs` | Staging operator harness |

## Evidence and audit artifacts

| Path | Count / role |
|------|----------------|
| `Ap786/evidence/` | 1,700+ files — gate captures, NON_CLAIMS |
| `Ap786/ZORA_WALAT_L*.md` | 142+ gate narrative docs |
| `Ap786/NON_CLAIMS.md` (per gate) | 82+ boundary files |
| `docs/CONTINUATION_CHECKPOINT_2026-04-*.md` | Pre-Ap786 era — **STALE** |
| `docs/ops/zora-walat-*-2026-05-15.md` | Early ops reports — **STALE** |

## Gitignored operator-local (not in inventory counts)

Per `server/.gitignore` and `Ap786/P0_OPERATOR_LOCAL_CONFIG_GUIDE.md`:

- `server/.env`, `server/.env.local`
- `server/.staging-token.local`
- `server/.staging-operator-email.local`
- `server/.staging-checkout-url.local`

## Abandoned / duplicate / legacy patterns

| Artifact | Risk | Decision |
|----------|------|----------|
| `probe-multi-region.json` | Misleading name; Apr 2026 logs at root | **MUST REMOVE OR REWRITE** before pivot marketing |
| `softLaunchAdmin.routes.js` imported but **not mounted** in `app.js` | Dead route surface | **FREEZE** — fix or remove in future gate |
| Dual L-numbering (Ap786 L-11 vs CORE-10 L-11 vs engineering L13) | Audit confusion | **MUST NOT CLAIM** cross-namespace PASS |
| `Ap786/AP786_ALL_PASSES_INVESTOR_PROOF.md` | Overclaim vs L-12/L-13 open | **MUST NOT CLAIM** without re-audit |
| `server/docs/LAUNCH_READINESS.md`, `DEPLOYMENT_READINESS.md` | Title implies readiness | **FREEZE** — qualify scope |
| PR #5 dispute webhook (closed unmerged) | Legacy branch | **FREEZE** per L-86F |

## Files that must never be edited during pivot (without explicit gate)

- `server/prisma/migrations/**` (immutable history)
- `Ap786/evidence/**` (append-only evidence)
- `server/src/policy/restrictedRegions.js` (compliance boundary)
- `server/src/payment/webhookTruthContract.js`
- `server/src/ledger/ledgerService.js`
- Production/staging Vercel env (outside repo)

## Claim-heavy doc locations (flag for rewrite)

- `Ap786/AP786_ALL_PASSES_INVESTOR_PROOF.md`
- `Ap786/GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md`
- `Ap786/ZORA_WALAT_BOARD_READY_EXECUTIVE_SUMMARY_2026_05_21.md`
- `Ap786/ZORA_WALAT_INVESTOR_*`
- `server/docs/LAUNCH_READINESS.md`
- `server/docs/TRANSACTION_FORTRESS_COMPLETION_REPORT.md`
- `lib/l10n/app_localizations_en.dart` — "global minutes" marketing copy

---

*Audit-only inventory. No file mutations performed.*
