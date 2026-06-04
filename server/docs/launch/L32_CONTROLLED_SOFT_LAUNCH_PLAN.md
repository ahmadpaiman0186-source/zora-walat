# L32 — Controlled soft launch plan

**Gate:** L32 = **controlled** exposure of production to a **small cohort** under explicit gates — not general availability.  
**Status:** Documentation/spec only — **NOT RUNTIME VERIFIED**.

---

## L32 scope

| In scope | Out of scope |
|----------|----------------|
| Who may transact, when, and under which flags | Full marketing launch (L32 widens later under change control) |
| Go/no-go, command center timing, evidence | Actual env changes in this package (docs only) |
| Dependencies on L25–L31 | Completing L26–L31 verification (tracked separately) |

---

## Soft launch definition

**Controlled soft launch** means:

- Production stack may serve **real** infrastructure, but **money movement** and **user access** are constrained by policy (`PRELAUNCH_LOCKDOWN`, `PAYMENTS_LOCKDOWN_MODE`, `SOFT_LAUNCH_MODE`, allowlists — see `DEPLOYMENT_READINESS.md`).
- **No “silent” broad opening:** cohort size and geography are **documented** before widening.
- **Observation window:** engineering + support staffed; metrics and alerts reviewed per [`L32_SOFT_LAUNCH_METRICS_GUARDRAILS.md`](./L32_SOFT_LAUNCH_METRICS_GUARDRAILS.md).

---

## Cohort model

| Phase | Typical cohort | Access mechanism |
|-------|----------------|------------------|
| **C0 — ops smoke** | Operators only | `/ready`, synthetic checks, **no** public checkout |
| **C1 — single owner** | One verified identity | `OWNER_ALLOWED_EMAIL` + `ZW_REQUIRE_OWNER_ALLOWED_EMAIL=true` |
| **C2 — small trusted set** | N known emails/devices | Expand allowlist + monitor fraud signals |
| **C3 — limited public** | Rate-limited geography/product | Requires L31/L29 readiness; legal/comms approval |

Advancement **C0→C1→…** only after go/no-go PASS on prior phase.

---

## Allowed vs blocked users

- **Allowed:** identities explicitly on allowlist (or internal test accounts per policy).
- **Blocked:** everyone else until cohort widens — enforced by app gates, not “trust.”
- **Never** disable allowlist to “fix” support volume without incident review.

---

## Test-mode vs live-mode policy

- **Stripe:** `sk_test_` vs `sk_live_` / restricted keys — must match environment and `stripeLiveReadinessPreflight` rules (`server/src/config/stripeLiveReadinessPreflight.js`, `DEPLOYMENT_READINESS.md`).
- **Reloadly:** `RELOADLY_SANDBOX` must match intended phase; no sandbox creds on live money path.
- **Soft launch with live keys** still requires **cohort** and **monitoring** — test keys alone do not replace fraud controls.

---

## Money-path constraints (L32)

- **HARD NO-GO for this documentation mission:** enabling unchecked live money for general users; disabling `PRELAUNCH_LOCKDOWN` without signed checklist; skipping dual control on kill switches.
- **Default:** keep `PRELAUNCH_LOCKDOWN=true` and/or `PAYMENTS_LOCKDOWN_MODE=true` until go/no-go explicitly clears checkout for C1+.
- Real charges only when: Stripe live readiness **PASS**, webhook endpoint verified, support on-call named, rollback owner named.

---

## L25–L31 dependencies (summary)

| Gate | L32 dependency |
|------|----------------|
| **L25** | Restore credibility — `BACKUP_RESTORE_DRILL.md`, L25 readiness doc |
| **L26** | Runtime, `/ready`, timeouts — **NOT VERIFIED** → treat as launch risk |
| **L27** | Webhooks, disputes (PR #5) — **NOT VERIFIED** |
| **L28** | Reloadly prod — **PLANNED / NOT VERIFIED** |
| **L29** | Alerts/dashboards — docs may exist on other branches; runtime wiring TBD |
| **L30** | Support runbooks — docs on other branches |
| **L31** | Security checklist, fraud response — docs on other branches |

---

## Required approvals (template)

| Role | Approves |
|------|----------|
| Engineering lead | Technical go/no-go |
| Security champion | L31-equivalent checklist |
| Finance/ops | Money-path window |
| On-call primary | Staffing confirmed |

---

## Evidence before first live cohort charge

- Signed [`L32_GO_NO_GO_CHECKLIST.md`](./L32_GO_NO_GO_CHECKLIST.md) (or export)
- [`L32_EVIDENCE_PACK_TEMPLATE.md`](./L32_EVIDENCE_PACK_TEMPLATE.md) partial fill: Stripe mode, allowlist proof (redacted), `/ready` snapshot
- Rollback owner + incident channel id

---

## What can proceed before PR #4–#8 merge

- **Documentation and rehearsal** on staging; synthetic checks; checklist dry-runs.
- **No** dependency on merging those PRs for **writing** L32 specs; **runtime** fixes from those PRs may be **launch-blocking** until merged and verified.

---

## What cannot proceed until L26–L31 verified (typical)

- Broad cohort (C3), live keys + open catalog, disabling lockdown without alternate controls, production pen-test findings open (L38).

---

## NO-GO conditions (non-exhaustive)

- L25 restore **NOT CLOSED** when policy requires backup proof.
- No on-call rotation or no rollback owner.
- `secrets:scan` or preflight failures on release candidate.
- Mass `/ready` 503, unresolved ledger recon REQUIRED, or active fraud ring unmitigated.
- **Explicit:** do **not** set `PRELAUNCH_LOCKDOWN=false` for launch testing without checklist — this doc package does not authorize any env change.

---

## References

- `DEPLOYMENT_READINESS.md`, `PHASE1_LAUNCH_ROLLBACK_NOTES.md`, `PRODUCTION_MONEY_PATH_CHECKLIST.md`
- [`L32_GO_NO_GO_CHECKLIST.md`](./L32_GO_NO_GO_CHECKLIST.md), [`runbooks/L32_SOFT_LAUNCH_COMMAND_CENTER.md`](../runbooks/L32_SOFT_LAUNCH_COMMAND_CENTER.md)
