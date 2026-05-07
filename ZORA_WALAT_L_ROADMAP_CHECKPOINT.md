# Zora-Walat — L-track roadmap checkpoint

**Checkpoint date:** 2026-05-07  
**Project:** Zora-Walat  

**Note:** ChatGPT memory may be full; **this file is the durable project checkpoint** for continuity across sessions and tools.

---

## Progression rule

**Do not proceed to the next L unless the previous L is PASS/CLOSED.**

---

## Operational rule (proofs & drills)

**No live Stripe charges** and **no live Reloadly/provider calls** unless explicitly instructed for that task. Use synthetic keys, mock airtime, dry-run proofs, and integration tests as documented in `server/docs/`.

---

## Status summary

| Gate | Status |
|------|--------|
| **L1–L24** | **CLOSED** |
| **L25 — Production safety foundation (backup / restore / readiness)** | **IN PROGRESS — NOT CLOSED** — Docs/runbooks in repo (`server/docs/runbooks/BACKUP_RESTORE_DRILL.md`, `server/docs/L25_BACKUP_RESTORE_READINESS.md`). **Pending:** staging restore drill + redacted evidence per runbook; external readiness remains governed by **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`** (do not mark VERIFIED from docs alone). |

---

## L1–L24 checkpoint lines

*(Titles summarize the intended scope at close; rename if your internal tracker uses different labels.)*

- **L1 — CI & repo baseline — PASS/CLOSED —** Key proof: `.github/workflows/ci.yml` + `npm run test:ci` green — Risk: fork/local env differs from Actions services matrix.
- **L2 — Database & Prisma migrations — PASS/CLOSED —** Key proof: `npx prisma validate` + migrate deploy path — Risk: unmigrated schema vs generated client drift.
- **L3 — Auth & public API contracts — PASS/CLOSED —** Key proof: auth/API integration + contract tests — Risk: OTP/email infra variance outside CI.
- **L4 — Wallet ledger invariants — PASS/CLOSED —** Key proof: wallet ledger docs + idempotency tests — Risk: strict invariant mode vs legacy paths.
- **L5 — Stripe integration (test-shaped) — PASS/CLOSED —** Key proof: webhook + checkout proofs without live charges — Risk: dashboard/webhook endpoint mismatch if ops rotates URLs ad hoc.
- **L6 — Phase 1 fulfillment path — PASS/CLOSED —** Key proof: Phase 1 money-path integration suite — Risk: queue off vs on behavior differs by env.
- **L7 — Reliability orchestration & L7 surfaces — PASS/CLOSED —** Key proof: reliability routes + failure classification — Risk: Redis unavailable degrades limits/metrics.
- **L8 — Self-healing & stale processing recovery — PASS/CLOSED —** Key proof: self-healing orchestrator + integration coverage — Risk: recovery bounded by configured intervals/batches.
- **L9 — Fraud / abuse / risk gates — PASS/CLOSED —** Key proof: fraud proofs + rate/abuse unit tests — Risk: tuning thresholds per market requires staging evidence.
- **L10 — Observability & ops metrics — PASS/CLOSED —** Key proof: `/metrics`, `/ready`, ops snapshots — Risk: per-replica metrics unless Redis aggregation enabled.
- **L11 — Retry/backoff & chaos harness matrix — PASS/CLOSED —** Key proof: `l11ChaosReliabilityHarness.test.js` + related integration proofs — Risk: lab timings ≠ production latency.
- **L12 — Reconciliation & money-path scans — PASS/CLOSED —** Key proof: reconciliation engines + sprint5/traceability tests — Risk: historical data anomalies need operator triage.
- **L13 — Launch / gate / preflight automation — PASS/CLOSED —** Key proof: `gate-check`, `phase1:launch-readiness`, preflight scripts — Risk: production intent env still human-validated.
- **L14 — Soft launch & operator controls — PASS/CLOSED —** Key proof: soft-launch admin + deployment readiness checklist — Risk: allowlist/flag mistakes restrict access unexpectedly.
- **L15 — Documentation & verification guides — PASS/CLOSED —** Key proof: `server/docs/*`, CI/release docs — Risk: docs lag code if not updated per release.
- **L16 — Client (Flutter) parity — PASS/CLOSED —** Key proof: `flutter analyze` / `flutter test` in CI matrix — Risk: device/OS-specific UI/network behavior.
- **L17 — Money-path security ordering — PASS/CLOSED —** Key proof: app mount-order tests (Stripe raw body before JSON) — Risk: new middleware ordering regressions without tests.
- **L18 — Integration/E2E certification — PASS/CLOSED —** Key proof: full `test:integration` + certified CI money-path flag path — Risk: integration DB fixture differs from prod scale.
- **L19 — Chaos & money-path failure verification — PASS/CLOSED —** Key proof: `server/docs/L19_CHAOS_VERIFICATION.md` + chaos/resilience integration suites — Risk: DLQ/replay paths partly static-verified vs fully automated.
- **L20 — Load testing — PASS/CLOSED —** Key proof: `npx prisma validate` passed; `webtopAbuseAndRate.test.js` passed 6/6; load scripts + docs: `server/scripts/load-sim-production-readiness.mjs`, `server/docs/L20_LOAD_VERIFICATION.md` — Risk: live load script needs a running API on `127.0.0.1:8787`; full money-path load must use a dedicated test DB; real DB/Redis ceilings need staging infrastructure metrics.
- **L21 — Multi-provider fallback — PASS/CLOSED —** Key proof: `providerFallbackPolicy.js` + instrumented `deliveryAdapter.js`; `server/docs/L21_PROVIDER_FALLBACK.md`; policy/unit tests — Risk: mock fallback env flags must never be enabled carelessly in production with Reloadly.
- **L22 — Distributed tracing / correlation — PASS/CLOSED —** Key proof: `server/docs/L22_DISTRIBUTED_TRACING.md`; `getTraceId()` correlation bridge; `l7Observability` / sanitization tests — Risk: OTEL SDK not wired; stdout JSON remains primary signal.
- **L23 — Auto-scaling infrastructure — PASS/CLOSED —** Key proof: `server/docs/L23_AUTO_SCALING.md`; API/worker split; advisory locks; Redis/scale gates — Risk: Redis/DB still regional SPOFs until infra HA.
- **L24 — Multi-region failover readiness — PASS/CLOSED —** Key proof: `server/docs/L24_MULTI_REGION_FAILOVER.md` (active-primary + warm-standby; no false active-active claim) — Risk: actual RTO/RPO depend on cloud replication/backups; queue state may be lost on Redis disaster without rehearsal.
- **L25 — Production safety foundation (backup / restore / readiness) — IN PROGRESS —** Key proof **pending:** staging backup restore drill + redacted evidence (`server/docs/runbooks/BACKUP_RESTORE_DRILL.md`). Docs slice: `server/docs/L25_BACKUP_RESTORE_READINESS.md`. — Risk: backups never rehearsed; treating Redis/BullMQ as durable without reconciliation; **never** `UPDATE`/`DELETE` ledger journal rows for DR “cleanup”.

---

## Next step

Complete **L25** staging restore rehearsal and evidence pack; then reconcile **`ZORA_WALAT_EXTERNAL_READINESS_AUDIT_2026-05-06.md`** Postgres backup rows with operator dashboards (repo docs do **not** substitute for VERIFIED). Do **not** advance **L26** until **L25** is PASS/CLOSED per progression rule.

---

*No secrets in this file.*
