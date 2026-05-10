# L38 — Security finding triage and remediation runbook

**Docs/spec.** Execution requires authorized personnel and approved change control.

## General triage flow

1. **Ingest** — source (pentest, bug bounty, internal review, dependency scanner).
2. **Classify** — severity using `L38_PENTEST_READINESS_CHECKLIST.md` table + `L38_LAUNCH_BLOCKING_SECURITY_FINDINGS_POLICY.md`.
3. **Contain** — if active exploitation suspected: rotate creds, block IPs, disable feature flags (governed).
4. **Remediate** — PR with tests; no hotfix without review for money path.
5. **Retest** — security lead or original tester confirms fix.
6. **Close** — ticket + evidence snippet (redacted).

## 1. Critical auth finding

**Examples:** JWT verification bypass, missing auth on admin route, session fixation.

**Steps**

1. Confirm reproducibility in **non-prod** first.
2. If production-affected: assess blast radius; force token refresh / logout if applicable.
3. Patch with tests; deploy via normal pipeline.
4. Retest all affected endpoints.

**Evidence:** PoC steps (redacted), PR link, retest note.

## 2. Payment / webhook finding

**Examples:** Missing signature verification, wrong event handling order, idempotency gap.

**Steps**

1. **Stop** any parallel rollout that widens exposure.
2. Verify Stripe Dashboard webhook config (names only in tickets).
3. Add/adjust tests for signature + replay; backfill idempotency if needed (design review mandatory).

**Evidence:** Event type matrix, test output summary.

## 3. Provider / fulfillment finding

**Examples:** Duplicate-send risk, unsafe retry flag, operator mapping injection.

**Steps**

1. Align with `L21_PROVIDER_FALLBACK.md` and fulfillment adapter code.
2. Do **not** enable emergency flags that violate production safety gates without exec approval.

**Evidence:** Correlation id discipline review, inquiry-before-retry state.

## 4. PII / privacy finding

**Examples:** PII in logs, over-collection, missing retention.

**Steps**

1. DPO/legal loop for regulatory notification threshold.
2. Scrub logs if feasible; tighten redaction config.

**Evidence:** Before/after log samples (redacted), policy update ticket.

## 5. Exposed secret finding

**Examples:** Key in git history, public env in build artifact.

**Steps**

1. **Rotate** credential immediately in secret manager.
2. Revoke old key at provider (Stripe, Reloadly, etc.) via **authorized** owners only.
3. Purge from history per platform policy (may require support).

**Evidence:** Rotation ticket ids only — **never** paste secrets.

## 6. Dependency vulnerability finding

**Examples:** CVE in npm dependency with exploit path.

**Steps**

1. Assess reachability (SAST/usage).
2. Patch version or isolate; run `npm test` (server) per release discipline.
3. Document residual risk if deferred.

## 7. Infrastructure misconfiguration finding

**Examples:** Public S3 bucket (if used), open DB port, mis-set CORS.

**Steps**

1. Platform owner validates in cloud console (authorized access).
2. Fix infra-as-code or dashboard setting with audit trail.
3. Rescan configuration after fix.

## 8. Fraud / abuse control finding

**Examples:** Rate limit bypass, credential stuffing viability.

**Steps**

1. Cross-check `ABUSE_HARDENING_MATRIX.md` and `RATE_LIMITING.md`.
2. Add WAF/rate rules at edge if applicable.

## Evidence capture

- Store in secure evidence directory; index with `L38_EVIDENCE_INDEX.txt` lineage when applicable.
- Use **suffixes** for order/user ids in shared channels.

## Remediation

- Money-path changes: two-person review + finance awareness if ledger-affecting.
- Document compensating controls if full fix is delayed (`L38_LAUNCH_BLOCKING_SECURITY_FINDINGS_POLICY.md`).

## Retest

- Required for Critical/High; optional for Medium per security lead.
- Retest in same environment class as original finding.

## Closure criteria

- Fix merged and deployed (or compensating control signed).
- Retest passed or risk formally accepted by signatory authority.
- No outstanding launch-blocking flags (if in launch window).

## Related

- [../security/L38_LAUNCH_BLOCKING_SECURITY_FINDINGS_POLICY.md](../security/L38_LAUNCH_BLOCKING_SECURITY_FINDINGS_POLICY.md)
- [../security/L38_PENTEST_READINESS_CHECKLIST.md](../security/L38_PENTEST_READINESS_CHECKLIST.md)
- [../PHASE1_PRODUCTION_SAFETY_GATES.md](../PHASE1_PRODUCTION_SAFETY_GATES.md)
