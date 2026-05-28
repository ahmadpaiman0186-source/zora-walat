# STR-13 Runtime Proof Capture Matrix

**Date:** 2026-05-27
**Status:** **PENDING CAPTURE — SCAFFOLD ONLY**
**Companion:** [ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md](./ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md)

---

## 1. Rules

- Mark each row **PENDING CAPTURE** unless an existing merged Ap786 artifact already proves the row without extrapolation.
- Do not fabricate screenshots, logs, HTTP results, or DB rows.
- Pre-STR-12 probes (for example STR-08) do **not** satisfy post-STR-12 runtime proof rows.

---

## 2. Capture matrix

| Evidence ID | Required capture | Purpose | Status | Notes |
|-------------|------------------|---------|--------|-------|
| **STR13-001** | `main` synced after PR **#89** (STR-12 merge-readiness evidence) | Prove repo baseline includes STR-12 merge + blocker evidence lineage | **PENDING CAPTURE** | Operator baseline says synced; screenshot/commit capture still required |
| **STR13-002** | Vercel staging deployment after STR-12/PR **#87** visible | Prove deployed artifact includes STR-12 implementation commit | **PENDING CAPTURE** | Target project: `zora-walat-api-staging` unless operator maps otherwise |
| **STR13-003** | Staging route reachable evidence for `/webhooks/stripe` | Prove route surface reachable on staging after STR-12 merge | **PENDING CAPTURE** | Prior invalid-signature `400` (STR-02/STR-08) is pre-STR-12 or not post-merge proof |
| **STR13-004** | Controlled invalid-signature rejection evidence | Prove safe rejection path observable after STR-12 if separately approved | **PENDING CAPTURE / NOT AUTHORIZED** | Requires explicit phrase: `APPROVE STR-13 STAGING AUDIT DEPLOYMENT AND INVALID-SIGNATURE PROOF ONLY` |
| **STR13-005** | Vercel runtime marker/log evidence | Correlate route entry, signature failure, response, and/or audit markers in staging logs | **PENDING CAPTURE** | STR-08 captured **NOT FOUND** pre-STR-12; post-STR-12 capture still open |
| **STR13-006** | Durable audit persistence evidence if available | Show non-money audit metadata recorded without raw payload/secrets/PII | **PENDING CAPTURE** | Read-only evidence only; no DB mutation |
| **STR13-007** | No payment/wallet/order mutation evidence | Prove capture window did not mutate money-path state | **PENDING CAPTURE** | Operator attestation + absence of mutation proof |
| **STR13-008** | Final conservative verdict | Close STR-13 capture cycle with claim boundaries | **PENDING CAPTURE** | Use [STR13_FINAL_CONSERVATIVE_VERDICT.md](./evidence/str13-post-str12-runtime-proof-2026-05-27/STR13_FINAL_CONSERVATIVE_VERDICT.md) |

---

## 3. Forbidden capture shortcuts

| Shortcut | Status |
|----------|--------|
| Treat STR-12 merge as runtime proof | **FORBIDDEN** |
| Treat STR-09 Stripe email as app processing proof | **FORBIDDEN** |
| Treat STR-08 no-log result as post-STR-12 proof | **FORBIDDEN** |
| Fabricate Vercel log matches | **FORBIDDEN** |
| Use production endpoint or live mode | **FORBIDDEN** |

---

## 4. Conservative verdict (matrix-level)

| Item | Status |
|------|--------|
| STR13-001…STR13-008 | **PENDING CAPTURE** |
| STR-12 merged | **YES** |
| STR-12 runtime proof after merge | **PENDING** |
| Production-ready / real-money / pilot | **NO-GO** |
| Fix fully proven | **NOT CLAIMED** |

---

*STR-13 capture matrix — scaffold only; no evidence fabricated*
