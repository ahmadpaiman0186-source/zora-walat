# L-85 — Prior L / CORE classification matrix

**Verdict:** `CORE10-L85-VERDICT-001: L85_GLOBAL_REAL_PROOF_BASELINE_RECONCILED_NO_COMMERCIAL_READINESS`

**Legend:** RP=REAL PROOF · PRP=PARTIAL REAL PROOF · GOV=GOVERNANCE ONLY · GATE=GATE ONLY · PLAN=PLAN ONLY · SS=SCREENSHOT ONLY · PREV=PREVIEW ONLY · NP=NOT PROVEN · RERUN=MUST RE-RUN UNDER GLOBAL REAL-PROOF STANDARD

| ID | Date | PR | Evidence path | Claimed status | Real-proof class | Missing evidence | Re-proof action | Blocks real-money | Blocks global launch |
|----|------|-----|---------------|----------------|------------------|------------------|-----------------|-------------------|---------------------|
| Global audits 03-28→05 | 2026-03-28+ | — | `Ap786/GLOBAL_*_AUDIT_*.md` | Audit filed | **GOV** | Runtime execution | N/A — audit only | NO | NO |
| **CORE-00** | 2026-05-28 | — | `ZORA_WALAT_CORE00_*` | Execution gate | **GATE** | All G1–G4 execution | Return-to-core authorized run | YES | YES |
| **CORE-01** | 2026-05-28 | — | `ZORA_WALAT_CORE01_*` | Readiness review | **GOV** | Provider API execution | CORE-07 drill | YES | YES |
| **CORE-02** | 2026-05-29 | — | `ZORA_WALAT_CORE02_*` | Sandbox boundary | **GOV** | Sandbox drill executed | CORE-07 | YES | YES |
| **CORE-03** | 2026-05-29 | — | `ZORA_WALAT_CORE03_*` | Architecture review | **GOV** | Live invariant proof | Wired runtime proof | YES | YES |
| **CORE-04** | 2026-05-29 | — | `ZORA_WALAT_CORE04_*` | Local doctor tests | **PRP** | Staging/live doctor | CORE-10 scan + runtime | YES | YES |
| **CORE-05** | 2026-05-29 | — | `ZORA_WALAT_CORE05_*` | Local idempotency kernel | **PRP** | Live duplicate block | Wire + prove live | YES | YES |
| **CORE-06** | 2026-05-29 | — | `ZORA_WALAT_CORE06_*` | Local NPNS classify | **PRP** | Live NPNS | Wire + prove live | YES | YES |
| **CORE-07** | 2026-05-29 | — | `ZORA_WALAT_CORE07_*` | Drill gate | **GATE** | Drill executed | Authorized sandbox drill | YES | YES |
| **CORE-08** | 2026-05-29 | — | `ZORA_WALAT_CORE08_*` | Dry-run engine local | **PRP** | Apply enabled | Stay dry-run until proof | YES | YES |
| **CORE-09** | 2026-05-29 | — | `ZORA_WALAT_CORE09_*` | Pilot gate | **GATE** | Pilot not approved | CORE-09 approval + execution | YES | YES |
| **CORE-10** | 2026-05-29+ | — | `ZORA_WALAT_CORE10_*` | Observability gate | **GATE/GOV** | Staging scan closure | L-84N redeploy + HTTP + logs | YES | YES |
| **CORE-11** | 2026-05-29 | — | `ZORA_WALAT_CORE11_*` | Real-money NO-GO | **GATE** | Real-money approval | Full money-path proof | YES | YES |
| **CORE-12** | 2026-05-29 | — | `ZORA_WALAT_CORE12_*` | Rollup filed | **GOV** | Live tier proof | Execute backlog | YES | YES |
| **L-36A** | 2026-06-01 | #151 | `ZORA_WALAT_L36A_*` | Proof standard rules | **GOV** | N/A | Enforce on future gates | NO | NO |
| **L-36B** | 2026-06-01 | — | `ZORA_WALAT_L36B_*` | Screenshot reintake | **SS** | Production runtime | Real observability proof | YES | YES |
| **L-3–L-6** | 2026-05-30 | — | `ZORA_WALAT_L3_*` … `L6_*` | CORE-10 capture gates | **GATE/GOV** | Snapshot execution | Authorized capture | YES | YES |
| **L-10–L-29** | 2026-05-30–31 | various | Surface/redeploy/token | Partial redeploy evidence | **PRP/GOV** | End-to-end webhook | Staging correlation | YES | YES |
| **L-34–L-41** | 2026-06-01–02 | — | Observability capture | Screenshot intake | **SS/GATE** | Alert routing proof | Operator captures + correlation | YES | YES |
| **L-63–L-71** | 2026-06-05–06 | — | Provider/webhook captures | Partial captures | **PRP/SS** | Full visible content | Complete webhook rows | YES | YES |
| **L-74** | 2026-06-07 | #190 | `ZORA_WALAT_L74_*` | BLOCKED | **NP** | Prod destination + delivery | Operator prod-labeled capture | **YES** | **YES** |
| **L-75** | 2026-06-07 | — | `ZORA_WALAT_L75_*` | Local unit capture | **PRP** | Live wired | L-76+ runtime | YES | YES |
| **L-76** | 2026-06-07 | — | `ZORA_WALAT_L76_*` | BLOCKED | **NP** | Safe wired command | Harness + proof | YES | YES |
| **L-77–L-80** | 2026-06-07–08 | — | Code-only shadow | Implemented | **GOV/PRP** | Staging runtime | Deploy + trigger + logs | YES | YES |
| **L-81–L-83** | 2026-06-08 | — | Shadow diagnostics | BLOCKED/PARTIAL | **NP/GOV** | Safe trigger + logs | L-84N redeploy + HTTP | YES | YES |
| **L-84** | 2026-06-08 | — | Runtime proof exec | BLOCKED | **NP** | Zero log lines | Post-L-84N redeploy + POST | YES | YES |
| **L-84B–L-84F** | 2026-06-08–09 | — | Credential gates | GATE ONLY | **GATE** | Provisioning | L-84N (partial) | YES | YES |
| **L-84G** | 2026-06-09 | #211 | `ZORA_WALAT_L84G_*` | BLOCKED | **NP** | Token not saved | Superseded by L-84N attestation | YES | YES |
| **L-84H–L-84M** | 2026-06-09 | #212–#217 | Stripe/attestation/target lock | GATE/GOV | **GATE/GOV** | Rotation/runtime | Track A execution if needed | YES | YES |
| **L-84N** | 2026-06-09 | **#218** | `ZORA_WALAT_L84N_*` | PROVISIONED | **PRP** | Redeploy + HTTP + logs | L-84M Track C after redeploy | YES | YES |

---

*End.*
