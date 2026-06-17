# L-85L — Secret handling requirements

Applies to **all future gates** in the L-85 read-only runtime proof chain (L-85M+). Reinforced in L-85L authorization filing.

---

## 1) Absolute prohibitions

| Prohibition | Scope |
|-------------|-------|
| No secret in chat | Assistant, Slack, email, tickets |
| No secret screenshots | Vercel UI, Neon console, terminal |
| No raw env output | `vercel env pull`, `printenv`, logs |
| No host/URL/password/token in evidence | Ap786 files, PR bodies, commit messages |
| No `.env.local` reading | Operator and agent gates |
| No Vercel env **value** printing | CLI or UI copy logged to evidence |
| No connection string in repo | Tracked or gitignored commit attempts |

---

## 2) Allowed evidence formats

| Allowed | Example |
|---------|---------|
| Env key **names** | `READ_ONLY_DATABASE_URL`, `OPS_HEALTH_TOKEN` |
| Boolean flags | `readonly_role_expected: true` |
| Enum verdicts | `verdict: PASS` |
| Project **names** | `zora-walat-api-staging` |
| Deploy IDs | Opaque structural IDs |
| Counts | `scoped_tables_checked_count: 6` |
| Timestamps | ISO-8601 UTC |
| Operator attestation | YES/NO without values |

---

## 3) Operator handling (future L-85M)

| Step | Requirement |
|------|-------------|
| Copy read-only URL from secure storage | Direct paste into Vercel field |
| Verify field name before save | Prevent wrong-field paste (L-84R) |
| Clear clipboard after paste/save | Mandatory |
| Discard locally generated tokens if rotation aborted | L-84R/L-85H pattern |
| Do not share URL in authorization chat | Use attestation only |

---

## 4) Agent / automation constraints

| Constraint | L-85L |
|------------|-------|
| Read `server/.env.local` | **NO** |
| Run Vercel CLI | **NO** |
| Connect Neon | **NO** |
| Print env values in command output | **NO** |
| Commit secrets | **NO** — `secrets:scan` required |

---

## 5) Post-filing validation

| Check | When |
|-------|------|
| `npm --prefix server run secrets:scan` | Before commit; after any code/evidence change |
| Review evidence diff for accidental paste | Before commit |
| Redact operator screenshots before attach | If UI evidence used in L-85M |

---

## 6) Exposure response (pointer)

If exposure suspected during future L-85M:

1. **Abort** save/deploy/proof immediately.
2. Follow [ROLLBACK_AND_REVOCATION_PLAN.md](./ROLLBACK_AND_REVOCATION_PLAN.md).
3. File hygiene gate (L-85H pattern) — no secret values in evidence.

---

## 7) L-85L attestation

| Item | Status |
|------|--------|
| Secret printed in L-85L | **NO** |
| Secret committed in L-85L evidence | **NO** |
| `.env.local` read | **NO** |

---

*End.*
