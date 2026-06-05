# L-60 — Rollback drill scope and boundaries

**Date:** 2026-06-05
**L-45 row:** 10 — Rollback drill evidence
**L-60 action:** **PLAN ONLY** — rollback **NOT EXECUTED**

---

## 1. Scope (future L-61 default)

| In scope (read-only) | Out of scope (L-60 / default L-61) |
|----------------------|--------------------------------------|
| Identify rollback target (SHA/tag) from deploy UI | Click rollback button |
| Capture deployment history screenshot | Promote redeploy |
| Document rollback readiness checklist | Modify Vercel / GitHub settings |
| File NO-ROLLBACK attestation | Execute prod rollback |

---

## 2. Rollback target identification (read-only)

| Step | Action | Mutation |
|------|--------|----------|
| 1 | Open Vercel prod deployment list (read-only) | **NO** |
| 2 | Note current prod SHA (redacted in evidence if needed) | **NO** |
| 3 | Note prior known-good SHA candidate (from docs — not executed) | **NO** |
| 4 | Capture `ROLLBACK-TARGET-READONLY-001-redacted.png` | **NO** |

---

## 3. Rollback readiness evidence (read-only)

| Evidence | Captures |
|----------|----------|
| `ROLLBACK-CAPABILITY-READONLY-001-redacted.png` | Deploy UI showing rollback **option visible** — not clicked |
| Health correlation | Reference existing API/frontend health PNGs — no new probe required in L-61 |

**Rollback proof is NOT CLAIMED** from visibility alone.

---

## 4. Hard boundaries

| Action | L-60 | Default L-61 |
|--------|------|--------------|
| Perform rollback | **FORBIDDEN** | **FORBIDDEN** |
| Click rollback | **FORBIDDEN** | **FORBIDDEN** |
| Deploy / redeploy | **FORBIDDEN** | **FORBIDDEN** |
| Modify Vercel/GitHub | **FORBIDDEN** | **FORBIDDEN** |

Live rollback execution requires **separate explicit authorization** beyond L-61 capture phrase.

---

## 5. L-45 row 10 status

| Field | Value |
|-------|-------|
| After L-60 | **OPEN** (plan filed only) |
| Rollback drill executed | **NO** |
| Rollback proof | **NOT CLAIMED** |

---

*End of rollback drill scope and boundaries.*
