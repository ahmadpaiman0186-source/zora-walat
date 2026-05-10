# L32 — Rollback and kill-switch plan

**Purpose:** Ordered responses when soft launch goes wrong. **Docs only** — env changes require authorized operators.

---

## Rollback hierarchy (prefer top first)

1. **Non-deploy toggles:** `PAYMENTS_LOCKDOWN_MODE=true`, keep webhooks processing if policy allows (`DEPLOYMENT_READINESS.md` §12).
2. **Tighten prelaunch:** `PRELAUNCH_LOCKDOWN=true` — blocks new checkouts/top-ups per product behavior; **do not** use as permanent fix without follow-up.
3. **Redeploy:** previous known-good release (API + worker **same** revision).
4. **Stripe:** Dashboard — disable endpoint or rotate signing secret **only** with coordinated redeploy (avoid orphan deliveries).
5. **Provider:** Reloadly kill-switch / feature disablement per L28 runbooks.
6. **Database:** **not** “rollback schema” casually — forward migration or restore per L25 only.

---

## Kill-switch matrix

| Switch / control | Effect | Owner | Two-person? |
|------------------|--------|-------|-------------|
| `PAYMENTS_LOCKDOWN_MODE` | Stops new payments surface | Eng lead | Y if live money |
| `PRELAUNCH_LOCKDOWN` | Lockdown + CORS behavior | Eng lead | Y |
| `SOFT_LAUNCH_MODE` | Telemetry / summary behavior | Eng | N (monitoring) |
| Allowlist removal | Blocks all non-listed users | Eng + Product | Y |
| `FULFILLMENT_DISPATCH_KILL_SWITCH` (if used) | Stops dispatch | Ops + Eng | Y |
| Stripe webhook disable | Stops new payment events | Eng + Finance | Y |

---

## Prelaunch lockdown handling

- Raising lockdown is **first-line** containment; document time and approver.
- Communicate: “temporarily unavailable” — not internal stack details.

---

## Stripe / webhook rollback

- Prefer **stop new checkouts** before deleting webhook configuration.
- Coordinate secret rotation with second reviewer; verify Dashboard deliveries after.

---

## Provider / Reloadly rollback

- Halt outbound fulfillment if duplicate-send risk; use provider console per `RELOADLY_PRODUCTION_REHEARSAL.md`.
- Sandbox/live mismatch → **NO-GO** until env corrected (no soft launch).

---

## Feature / capability disablement

- Use existing env flags and deploy toggles; avoid hot-patching production code without PR.

---

## User / cohort pause

- Stop widening allowlist; shrink to C0 if needed.
- Do not mass-delete user data without legal.

---

## Support communications

- Hand off to L30-style templates: outage / payment pending investigation.
- No blame; no ETA unless incident commander approves.

---

## Data integrity verification

- Post-rollback: recon scan, queue vs DB, no manual ledger `UPDATE`/`DELETE`.
- Compare Stripe balance vs internal summaries per finance process.

---

## Forbidden rollback actions

- Editing `LedgerJournalEntry` / `LedgerJournalLine` in prod to “fix” display
- Replaying webhooks blindly to “speed up” recovery
- Disabling Stripe signature verification
- Single-person live key rotation

---

## Two-person approval

Required for: `PRELAUNCH_LOCKDOWN=false` during incident, Stripe webhook disable, production secret rotation, mass cohort enablement.

---

## Post-rollback evidence

- Timeline, toggles changed (names only), deploy ids, recon results summary
- Link incident ticket; store in evidence pack

---

## References

- `PHASE1_LAUNCH_ROLLBACK_NOTES.md`, `BACKUP_RESTORE_DRILL.md`, `INCIDENT_SCENARIOS.md`
