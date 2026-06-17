# L-85S — PR #5 deep audit requirements

**PR:** #5 — L27 dispute webhook hardening  
**Branch:** `l27-dispute-webhook-hardening`  
**Risk tier:** **HIGH** (confirmed per L-85R; not disproven in L-85S)

---

## Why PR #5 is payment / runtime / security-adjacent

| Surface | Evidence (L-85R) |
|---------|------------------|
| Stripe webhook routing | `stripeWebhook.routes.js` |
| Stripe client/service layer | `stripe.js`, `phase1StripeChargeIncidents.js` |
| Health / readiness probes | `health.routes.js`, `readinessBoundedChecks.js` |
| Payment incident handling | dispute retrieve / 503 hardening tests (`stripeWebhookDisputeRetrieve503.test.js`) |
| Integration coverage | `phase1Resilience.integration.test.js` |

These paths affect **money-adjacent webhook ingestion**, **dispute lifecycle handling**, and **deploy/readiness signaling** — all fail-closed critical surfaces.

## Why immediate merge is NOT allowed

| Blocker | Detail |
|---------|--------|
| Stale branch | **607 commits** behind post-L-85R `main` |
| Likely merge conflict | L-85R `merge-tree`: **likely_conflict** |
| Parallel evolution on `main` | Related webhook/incident/slim-webhook work merged independently (L-84/L-85 arcs) |
| Indeterminate CI | Checks stale (success + pending at open; never re-run on current `main`) |
| No deep diff audit | Unknown interaction with slim Stripe pre-bootstrap handler and staging deploy paths |
| Global proof standard | No payment/provider/market proof attached to this PR |

**Immediate merge recommended: NO**

## Close recommendation

**NO** — do not close before dedicated audit. Runtime hardening may still have value if rebased and proven safe.

---

## Required future deep-audit gates (before any merge authorization)

Each gate is **evidence-only or controlled proof** unless operator expands scope. **No merge** inside audit gates.

### Gate A — Isolated diff review

- Full file-level diff PR #5 vs current `main` for all 11 touched paths
- Map each hunk to: webhook security, dispute handling, health/readiness, incident service
- Flag dead code, duplicate logic vs slim webhook handlers, and removed guards

### Gate B — Conflict / rebase analysis

- Rebase branch onto current `main` in a **throwaway worktree** (no push without authorization)
- Document conflict files and resolution risk
- Confirm `merge-tree` prediction

### Gate C — Payment webhook impact analysis

- Trace dispute webhook code paths: signature verify → route → retrieve → incident persistence
- Compare with current `slimStripeWebhookHandler` pre-bootstrap path on `main`
- Document fail-closed behavior for invalid signature, 503 retrieve, idempotency

### Gate D — No-pay-no-service impact analysis

- Confirm changes do not weaken checkout/payment gating or webhook-only money paths
- Verify no new owner-DB or env fallback patterns
- Cross-check against L-84 Stripe/Vercel dependency mapping evidence

### Gate E — Security and secret-surface review

- No new secret logging, header echo, or connection string exposure
- Token/webhook secret handling unchanged or stricter
- `secrets:scan` + static review on rebased diff

### Gate F — Test matrix review

- Enumerate tests added/changed in PR #5
- Run isolated test suites on rebased branch only after operator authorization
- Require L-85K/L-85P regression suites pass if runtime touched

### Gate G — Rollback plan

- Document revert commit range and staging redeploy step
- Identify webhook replay / duplicate incident risk on rollback
- Rollback attestation template (evidence-only)

### Gate H — Staging proof plan

- **Separate authorized gate** — invalid-signature webhook POST only unless operator authorizes broader proof
- No production customer impact
- No env mutation without explicit gate (L-84E/L-85L pattern)

---

## Conservative PR #5 disposition

| Action | Allowed now | Next step |
|--------|-------------|-----------|
| Merge | **NO** | Complete Gates A–H sequentially |
| Close | **NO** | Hold open pending audit |
| Rebase | **NO** (this gate) | Future authorized rebase gate |

**Next authorized gate:** `L-85T` or operator-named **PR5 isolated diff + conflict analysis** (evidence-only).

---

*End.*
