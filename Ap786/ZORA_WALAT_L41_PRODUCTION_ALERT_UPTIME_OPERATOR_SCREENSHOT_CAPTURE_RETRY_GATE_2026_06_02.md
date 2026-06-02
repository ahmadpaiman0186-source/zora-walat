# L-41 — Production Alert / Uptime Operator Screenshot Capture Retry Gate

**Date:** 2026-06-02
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System
**L-step:** **L-41** — Production alert / uptime operator screenshot capture retry gate (docs only)
**Branch:** `docs/l41-production-alert-uptime-operator-screenshot-capture-retry-gate-2026-06-02`
**Base:** `adadb68` — L-40 merged (PR #157, commit `8130fbf`)
**Artifacts:** [l41 evidence folder](./evidence/l41-production-alert-uptime-operator-screenshot-capture-retry-gate-2026-06-02/)

---

## 1. Purpose

Define the **exact operator capture requirements** for the **four missing** production observability screenshots identified by [L-39](./ZORA_WALAT_L39_PRODUCTION_ALERTS_UPTIME_INCIDENT_ROUTING_CAPTURE_GATE_2026_06_02.md) and confirmed missing at [L-40](./ZORA_WALAT_L40_PRODUCTION_ALERT_ROUTING_UPTIME_SCREENSHOT_INTAKE_2026_06_02.md) intake.

L-41 is a **retry capture gate** — documentation and operator instructions only. It does **not** execute intake, navigate dashboards, or alter launch posture.

**Global proof standard:** Real production proof required; docs ≠ proof; partial ≠ launch.

---

## 2. Baseline from L-40

| Field | Value |
|-------|-------|
| L-40 merge | PR **#157** · merge `adadb68` · commit `8130fbf` |
| L-40 verdict | **PENDING_OPERATOR_CAPTURE** |
| Expected screenshots | **4** |
| Found | **0** |
| Copied | **0** |
| Fabricated | **0** |
| Production observability FULLY_PROVEN | **false** |
| Launch posture | **NO-GO** (all dimensions) |

Prior gates: [L-39](./ZORA_WALAT_L39_PRODUCTION_ALERTS_UPTIME_INCIDENT_ROUTING_CAPTURE_GATE_2026_06_02.md) (9-category manifest) · [L-38](./ZORA_WALAT_L38_PRODUCTION_OBSERVABILITY_SCREENSHOT_INTAKE_EVIDENCE_2026_06_01.md) (**PARTIAL**, 5 deployment PNGs).

---

## 3. Required screenshot list

| # | Filename | Must prove |
|---|----------|------------|
| 1 | `OBS-ALERT-ROUTING-001-2026-06-02-redacted.png` | Production **alert routing policy** exists (rule name, condition, route target) |
| 2 | `OBS-ALERT-CHANNEL-001-2026-06-02-redacted.png` | Production **alert channel destination** exists and is configured (type + route; no secrets) |
| 3 | `OBS-UPTIME-FRONTEND-001-2026-06-02-redacted.png` | Production **frontend uptime/synthetic monitor** exists (`zorawalat.com` or prod alias) |
| 4 | `OBS-UPTIME-API-001-2026-06-02-redacted.png` | Production **API uptime/synthetic monitor** exists (`zora-walat-api` / prod API host) |

**Production scope:** Not staging-only (`*-staging*`), not Stripe sandbox for these four rows.

---

## 4. Redaction requirements

| Rule | Detail |
|------|--------|
| **Redact** | Secrets, tokens, webhook URLs, API keys, private emails (if needed), phone numbers, sensitive internal IDs |
| **Do not over-redact** | Preserve service name/type, monitor or alert status, target class, timestamp or current UI context where available |
| **Forbidden** | Fabricated, mock, placeholder, or edited-content evidence |
| **Never visible** | `whsec_*`, bearer tokens, env panel values, raw webhook bodies |

See [L-39 REDACTION_POLICY.md](./evidence/l39-production-alerts-uptime-incident-routing-capture-gate-2026-06-02/REDACTION_POLICY.md) for full policy.

---

## 5. Capture acceptance criteria

All must be true before L-42 intake may proceed:

- [ ] All **4** PNGs exist in the required intake path (§9).
- [ ] All **4** filenames **exactly** match expected names (§3).
- [ ] All **4** are real operator captures (not stock, not reused L-38 deploy PNGs).
- [ ] Redaction preserves proof value per §4.
- [ ] Production scope visible in each frame.
- [ ] Evidence can support follow-up **L-42** read-only intake.

---

## 6. Rejection criteria

Reject and **do not commit** if any trigger applies:

| ID | Reject when |
|----|-------------|
| R1 | Wrong filename or missing file |
| R2 | Staging/sandbox labeled as production proof |
| R3 | Secret, token, webhook URL, or API key visible |
| R4 | Mock, placeholder, or fabricated image |
| R5 | L-38 deployment screenshot reused as alert/uptime proof |
| R6 | Over-redaction removes service name, monitor status, or target class |
| R7 | Screenshot claims production-ready or launch-ready in filename/metadata |

---

## 7. File naming standard

```
{OBS-ID}-2026-06-02-redacted.png
```

Examples (exact):

- `OBS-ALERT-ROUTING-001-2026-06-02-redacted.png`
- `OBS-ALERT-CHANNEL-001-2026-06-02-redacted.png`
- `OBS-UPTIME-FRONTEND-001-2026-06-02-redacted.png`
- `OBS-UPTIME-API-001-2026-06-02-redacted.png`

No spaces. Lowercase extension `.png`. Date segment **`2026-06-02`** fixed for this retry gate.

---

## 8. Operator checklist

**Before capture**

- [ ] Confirm production project/domain (not staging).
- [ ] Open alert/uptime tooling manually (agent must **not** navigate dashboards).
- [ ] Prepare redaction tool (crop/blur) before copy to repo.

**Capture (one PNG per row §3)**

- [ ] Alert routing policy panel
- [ ] Alert channel/destination panel (redact webhook URLs)
- [ ] Frontend uptime/synthetic monitor for `zorawalat.com`
- [ ] API uptime/synthetic monitor for `zora-walat-api`

**After capture**

- [ ] Verify filenames match §7 exactly.
- [ ] Copy into intake path §9.
- [ ] Request **L-42** intake with authorization phrase (separate session).

---

## 9. Evidence intake path

**Primary (required):**

```
Ap786/evidence/l39-production-alerts-uptime-incident-routing-capture-gate-2026-06-02/screenshots-redacted/
```

L-40/L-42 intake copies from this folder. Do **not** use alternate paths without manifest update.

**L-41 gate folder (docs only):**

```
Ap786/evidence/l41-production-alert-uptime-operator-screenshot-capture-retry-gate-2026-06-02/
```

---

## 10. Conservative verdict

| Field | Value |
|-------|-------|
| **CORE10-L41-VERDICT-001** | **CAPTURE_GATE_FILED_ONLY** |
| Proves production observability | **false** |
| Changes NO-GO launch posture | **false** |
| PNG artifacts at L-41 filing | **0** |

**L-41 is CAPTURE_GATE_FILED_ONLY.** It does **not** prove production observability. It does **not** change NO-GO status.

---

## 11. Blockers

| Blocker | L-41 action |
|---------|-------------|
| **CORE10-BLK-OBS-GAPS-001** | Remains **OPEN** — alert/uptime rows still **PENDING_OPERATOR_CAPTURE** |
| **CORE10-BLK-L40-PARTIAL-001** | Remains **PENDING_OPERATOR_CAPTURE** — L-41 defines retry steps |
| **CORE10-BLK-L39-GATE-001** | Remains **FILED / NOT PROOF** |
| **CORE10-BLK-L41-GATE-001** | **NEW** — **FILED / NOT PROOF** — retry capture gate only |

Incident/on-call, prod logs, money-path, rollback drill, SRE sign-off remain **PENDING_EVIDENCE** (L-39 rows 5–9).

---

## 12. Next authorized step

1. Operator files **4** redacted PNGs per §3–§9.
2. Authorize **L-42 — Production Alert / Uptime Screenshot Re-Intake** (read-only) with explicit approval phrase.
3. L-42 may upgrade verdict toward **PARTIAL_ALERT_UPTIME_SCREENSHOT_EVIDENCE** only if all four pass acceptance §5 — still **NOT FULLY_PROVEN**, still **NO-GO** launch.

---

## No-touch attestation

| Domain | Touched? |
|--------|----------|
| Production/staging runtime | **NO** |
| Deploy / env / secrets | **NO** |
| App/server code | **NO** |
| Dashboard navigation by agent | **NO** |

---

*End of L-41 gate document.*
