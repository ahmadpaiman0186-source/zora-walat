# ZORA-WALAT SECURITY & COMPLIANCE RISK REGISTER — 2026-07-07

| Risk ID | Title | Severity | Path / evidence | Business | Security | Compliance | Required fix | Blocks launch |
|---------|-------|----------|-----------------|----------|----------|------------|--------------|---------------|
| R-001 | No registered legal entity | **CRITICAL** | L-90C audit; operator L-90C1A facts | Cannot contract/settle | Liability | Unlicensed operation risk | Entity formation + counsel | **YES** |
| R-002 | Money-transmission licensing unanalyzed | **CRITICAL** | `Ap786/ZORA_WALAT_XCH00_*`; no counsel deliverable | Regulatory enforcement | — | MSB/MTL unknown | Licensed counsel analysis | **YES** |
| R-003 | No published ToS/Privacy/legal review | **CRITICAL** | L-90C; no public `/terms` | Consumer harm | — | UDAAP / disclosure gaps | Counsel + publish + consent | **YES** |
| R-004 | Sanctions program = code only | **CRITICAL** | `restrictedRegions.js`; no external review | OFAC exposure | — | Program not validated | External compliance review | **YES** |
| R-005 | Real money / live Stripe not proven | **CRITICAL** | No live account proof | Customer funds | Fraud/chargeback | PCI scope unproven | Live Stripe + controls gate | **YES** |
| R-006 | Provider pass = NO | **HIGH** | L-90B4 blocked on Reloadly support | Failed fulfillment | — | Resale authorization | Sandbox proof then contract | **YES** |
| R-007 | Stripe bank = personal not business | **HIGH** | Operator L-90C1A confirmation | Settlement mismatch | — | KYC/entity mismatch | Business bank + Stripe profile | **YES** |
| R-008 | `DEV_CHECKOUT_AUTH_BYPASS` on staging | **HIGH** | Vercel name present | Auth bypass if mis-set | Critical if prod | — | Verify false in any prod-like host | **YES** |
| R-009 | Admin fulfillment replay / force-deliver | **HIGH** | `fulfillmentDlq.routes.js`, webtopup admin | Double fulfillment | Privilege abuse | — | RBAC audit + logging proof | **YES** |
| R-010 | KYC/AML not integrated | **HIGH** | XCH-00 DESIGN ONLY | Financial crime | — | BSA/AML gaps | Program + vendor if required | **YES** |
| R-011 | Refund/dispute manual only | **HIGH** | `PHASE1_REFUND_AND_DISPUTE.md` | Customer trust | — | Chargeback handling | Product + Stripe webhook sync | **YES** |
| R-012 | Claim inflation in Ap786 investor docs | **HIGH** | `AP786_ALL_PASSES_INVESTOR_PROOF.md` | Misleading investors | Reputation | — | LOCK or reword | **YES** (market) |
| R-013 | Dual L-gate numbering confusion | **MEDIUM** | Ap786 vs CORE-10 vs engineering L | Wrong gate cited | — | Audit failure | Namespace tags in all reports | **NO** |
| R-014 | `probe-multi-region.json` at repo root | **MEDIUM** | Root artifact | Misleading scale claims | — | — | Remove or relocate | **NO** |
| R-015 | `softLaunchAdmin` unmounted route | **MEDIUM** | `app.js` import only | Dead feature | — | — | Mount or remove | **NO** |
| R-016 | `phase1-truth` serverless hang | **MEDIUM** | L-89B operator notes | Ops blind spot | — | — | Slim operator endpoints | **NO** |
| R-017 | Local unit tests blocked without DB | **MEDIUM** | `npm test` failed 2026-07-07 | Dev velocity | — | — | CI truth source; local TEST_DATABASE_URL | **NO** |
| R-018 | No runtime staging region-block proof | **MEDIUM** | Tests only | Wrong jurisdiction | — | Sanctions gap | L-90C3 readonly HTTP proof | **YES** (compliance) |
| R-019 | No business continuity / staffed support | **MEDIUM** | AFG-CARD spec NOT STAFFED | Customer harm | — | — | Ops plan | **YES** (public) |
| R-020 | PCI compliance not claimed/proven | **MEDIUM** | Hosted checkout scope only | — | Card data scope | No SAQ/AOC | Stripe SAQ if claiming | **YES** (real money) |
| R-021 | Secrets in operator local files | **LOW** | `.env.local` gitignored | — | Leak if committed | — | `secrets:scan` + hygiene | **NO** |
| R-022 | CORS misconfiguration | **LOW** | `CORS_ORIGINS` env | — | CSRF-like | — | Staging allowlist review | **NO** |

## Counts (this register)

| Severity | Count |
|----------|-------|
| **CRITICAL** | 5 |
| **HIGH** | 7 |
| **MEDIUM** | 8 |
| **LOW** | 2 |

## Secrets scan (2026-07-07)

| Command | Result |
|---------|--------|
| `npm run secrets:scan` (server) | **OK** — no high-confidence live-secret patterns in tracked sources |

**Note:** Scan does not prove historical leaks or operator local files.

---

*Risk register is audit-only. Not a penetration test or legal opinion.*
