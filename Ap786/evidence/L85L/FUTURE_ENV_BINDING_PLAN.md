# L-85L — Future env binding plan

**Status:** PLAN ONLY — **no env mutation performed in L-85L**.

Documents the **only** future allowed Vercel runtime env mutation after separate operator authorization (L-85M).

---

## 1) Allowed mutation (future L-85M only)

| Field | Value |
|-------|--------|
| Env key | **`READ_ONLY_DATABASE_URL`** |
| Action | **Set** (create or update) in approved Vercel target environment |
| Value source | Secure storage (password manager / Neon console copy) — **not chat, not repo** |
| Target project (first candidate) | **`zora-walat-api-staging`** — **INFERRED** |
| Target environment | **Staging** (Production binding **not authorized** for first proof) |

---

## 2) Value handling rules (operator — future)

| Rule | Requirement |
|------|-------------|
| Copy from secure storage | **YES** — never from chat/assistant output |
| Print value | **FORBIDDEN** |
| Screenshot value | **FORBIDDEN** |
| Commit value | **FORBIDDEN** |
| Paste into wrong Vercel field | **ABORT** — verify field name before save (L-84R lesson) |
| Clear clipboard after use | **REQUIRED** |
| Log value in terminal | **FORBIDDEN** |

---

## 3) Forbidden mutations (same gate or bundled)

| Env key / action | Status |
|------------------|--------|
| `DATABASE_URL` change | **FORBIDDEN** — owner URL must remain |
| `STRIPE_*` keys | **FORBIDDEN** |
| Payment env keys | **FORBIDDEN** |
| Provider env keys (Reloadly, etc.) | **FORBIDDEN** |
| `OPS_HEALTH_TOKEN` rotation | **Separate gate** — not bundled with read-only URL bind |
| Any other env key | **FORBIDDEN** unless separately scoped gate |

---

## 4) Post-bind expectations (structural — not proven in L-85L)

After future authorized bind + deploy:

| Runtime behavior | Expected |
|------------------|----------|
| `GET /ops/db-readonly-proof` without URL | Was `BLOCKED` / `readonly_url_missing` |
| After bind + deploy | Endpoint may attempt metadata checks |
| Owner routes (`/ready`, `/ops/health`) | Continue using `DATABASE_URL` unchanged |

**L-85L does not claim any of the above occurred.**

---

## 5) Evidence requirements for future bind attestation

Future L-85M operator attestation (no values):

| Evidence item | Format |
|---------------|--------|
| Vercel project name | Name only |
| Environment tier | staging / preview / production |
| Env key name present | `READ_ONLY_DATABASE_URL` — boolean/name only |
| `DATABASE_URL` unchanged | Operator attestation YES |
| Other keys unchanged | Operator attestation YES |
| Save confirmed | YES/NO |
| Redeploy triggered | YES/NO + deploy ID if yes |

---

## 6) L-85L execution status

| Action | Performed |
|--------|-----------|
| Vercel env set/update | **NO** |
| Vercel CLI | **NO** |
| Neon connect | **NO** |
| `.env.local` read | **NO** |

---

*End.*
