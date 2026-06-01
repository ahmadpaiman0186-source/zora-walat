# L-37 — Operator instructions (production observability capture)

**Date:** 2026-06-01
**Gate:** CORE10-L37-CAPTURE-GATE-001

---

## What the operator must do

1. **Capture manually** — open production Vercel/monitoring/APM/alert dashboards in your browser; agent must **not** navigate dashboards.
2. **Confirm production scope** — project names and domains must match production (`zora-walat-api`, `zora-walat`, `zorawalat.com`), not staging or sandbox.
3. **Redact before adding to repo** — apply [REDACTION_POLICY.md](./REDACTION_POLICY.md); if unsure, recapture with wider redaction.
4. **Name files** — `OBS-DASH-*-2026-06-01-redacted.png` (see [CHECKLIST.md](./CHECKLIST.md) for OBS IDs).
5. **Place files** — copy into [screenshots-redacted/](./screenshots-redacted/) on an evidence branch (Ap786 only).
6. **Never fabricate** — no generated, stock, or placeholder images.
7. **Never reuse** — do not copy STR-*, `VERCEL-STAGING-*`, frontend-qa, or Stripe sandbox PNGs as production proof.

---

## What the operator must not do

| Forbidden | Reason |
|-----------|--------|
| Production API probe without phrase | Runtime touch |
| Deploy / redeploy | Runtime touch |
| Login / token refresh in automated scripts | Credential touch |
| `cat .env.local` / `.staging-token.local` | Secret exposure |
| Edit Vercel/Stripe/Neon env | Config mutation |
| Live rollback without separate authorization | Production action |
| Label staging captures as production | Scope fraud |

---

## After filing artifacts

1. Request evidence review / re-intake (e.g. L-36B follow-up or L-38 capture session with authorization).
2. Reviewer runs redaction + abort checks.
3. Update [CHECKLIST.md](./CHECKLIST.md) and [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md).
4. Apply [PASS_FAIL_CRITERIA.md](./PASS_FAIL_CRITERIA.md) — may move from **PENDING_EVIDENCE** toward **PARTIAL** or **PASS_WITH_REAL_PROOF** only when criteria met.

---

*Instructions define safe capture; following them later does not retroactively prove L-37 gate filing.*
