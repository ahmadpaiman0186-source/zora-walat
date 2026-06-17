# L-85T — L-85M retry preconditions

**Conservative default: NO GO for L-85M until all preconditions below are satisfied and separately authorized.**

---

## Preconditions checklist

| # | Precondition | Status (L-85T) | Authorized gate |
|---|--------------|----------------|-----------------|
| 1 | `main` includes L-85K + L-85P + L-85Q evidence | **MET** | — |
| 2 | Staging structural unauthenticated route PASS | **MET** (L-85Q) | — |
| 3 | Local `test:db-readonly-proof` + `test:prebootstrap-readonly-proof` pass | **MET** | — |
| 4 | `secrets:scan` OK | **MET** | — |
| 5 | Operator authorizes L-85M retry explicitly | **NOT MET** | L-85M operator authorization |
| 6 | `READ_ONLY_DATABASE_URL` bound on `zora-walat-api-staging` | **NOT PROVEN** | L-85T+ sanitized bind attestation OR operator UI attestation gate |
| 7 | Staging redeploy picks up env (if required) | **UNKNOWN** | Post-bind deploy gate |
| 8 | `OPS_HEALTH_TOKEN` available to probe process securely | **NOT VERIFIED** | L-85M only — never print |
| 9 | Response redaction plan filed | **MET** (L-85L runbook) | Execute in L-85M |
| 10 | No row export / no write probe policy | **MET** (L-85K contract) | Execute in L-85M |
| 11 | Rollback / fail-closed policy | **MET** (L-85L) | Execute in L-85M |

---

## Exact next authorized steps (sequential)

### Step A — L-85T+ or operator attestation: env readiness (no secrets)

1. Operator authorizes **sanitized** readiness check OR confirms Vercel UI binding on **`zora-walat-api-staging`** staging environment.
2. Record **key name only**, bind occurred YES/NO, redeploy required YES/NO.
3. **No** value, host, URL, or password in evidence.

### Step B — Optional redeploy (if authorized)

1. Deploy from `server/` only (`npm run deploy:staging` guard path).
2. Record deployment ID and READY status only.
3. Re-run **unauthenticated** structural probe (L-85Q pattern) — no token.

### Step C — L-85M authenticated staging runtime proof (separate authorization)

1. Operator authorization recorded.
2. Inject `OPS_HEALTH_TOKEN` via secure process env — **not** chat, repo, or evidence.
3. Single controlled `GET /ops/db-readonly-proof` with Bearer or `X-ZW-Ops-Token`.
4. Capture **safe JSON flags only** per L-85K/L-85L contract.
5. Fail closed on any secret-like response field.
6. **No** row export, **no** write probe, **no** owner URL fallback.

### Step D — Evidence filing

1. File L-85M retry evidence under `Ap786/evidence/L85M/` (or successor gate ID).
2. Verdict PASS/FAIL/BLOCKED with non-claims.

---

## Token handling plan (L-85M)

| Rule | Requirement |
|------|-------------|
| Source | Secure operator storage only |
| Transmission | Process env injection for probe script |
| Evidence | Record token **used: YES/NO** only — never value |
| Logs | No header logging |
| Retry | No token in URL query strings |

---

## Response redaction plan (L-85M)

| Allow in evidence | Forbid in evidence |
|-------------------|-------------------|
| `verdict`, `reason`, boolean flags | password, token, URL, host |
| `current_user` role name if returned | connection string, raw env |
| `db_query_performed: false` etc. | table rows, customer data |

---

## Fail-closed policy

| Condition | Expected behavior |
|-----------|---------------------|
| Missing token | `401 BLOCKED token_missing` (proven L-85Q) |
| Invalid token | `401 BLOCKED token_invalid` |
| Missing readonly URL at runtime | `503` or `BLOCKED readonly_url_missing` |
| Any secret in response | Abort filing; treat as FAIL; rotate/review |

---

## Rollback

Per L-85L: remove or revoke `READ_ONLY_DATABASE_URL` on staging; redeploy; confirm unauthenticated route still fail-closed.

---

*End.*
