# L-84M — Track C: Runtime proof

**Verdict:** `CORE10-L84M-VERDICT-001: L84M_REAL_PROOF_EXECUTION_TARGET_LOCK_ONLY_NO_OPERATIONAL_ACTION`

**Execution in L-84M:** **NO** · **HTTP proof in L-84M:** **NO**

## 1. Required post-provisioning checks (before HTTP)

| # | Check | Pass criterion (name/state only) |
|---|-------|----------------------------------|
| 1 | `OPS_HEALTH_TOKEN` on `zora-walat-api-staging` | Name present in env list — **NOT PROVISIONED today** |
| 2 | Redeploy completed | Deployment ID recorded — staging project only |
| 3 | Local `ZW_OPS_HEALTH_TOKEN` | Operator attestation **SET** — no value |
| 4 | No unrelated env mutation | Attestation: only `OPS_HEALTH_TOKEN` added/updated |
| 5 | L-84 retry | **NOT AUTHORIZED** — shadow probe not in default path |

## 2. Allowed staging-only HTTP checks (future explicit approval only)

** Preconditions:** Track B complete + operator phrase for HTTP proof gate (see [OPERATOR_APPROVAL_PHRASES.md](./OPERATOR_APPROVAL_PHRASES.md)).

| Allowed | Forbidden |
|---------|-----------|
| `GET`/`POST` to **`zora-walat-api-staging.vercel.app`** paths scoped in gate | Production host `zora-walat-api.vercel.app` |
| Readiness / ops health with redacted headers | Webhook replay, payment mutation, DB writes |
| Shadow diagnostics probe **only if** L-84 retry separately authorized | Stripe API calls from agent |

## 3. Required evidence artifacts (redacted)

Each runtime proof filing must include:

| Field | Requirement |
|-------|-------------|
| Request timestamp | UTC ISO-8601 |
| Endpoint | Full HTTPS URL **or** path + host — no query secrets |
| HTTP method | GET/POST as executed |
| Status code | Numeric only |
| Response body | **Redacted** — no tokens, no `sk_`, `whsec_`, `pk_`, bearer material |
| Deployment ID | Vercel deployment identifier |
| App commit SHA | Git commit on deployed build |
| Header proof | “`X-ZW-Ops-Token` sent: YES” — **value NEVER logged** |
| Secret leakage scan | `secrets:scan` OK on any pasted logs |

## 4. Pass / fail verdict criteria

| Verdict | Criteria |
|---------|----------|
| **PASS (ops token runtime proof)** | Staging ops-gated route returns expected success status (e.g. 200) with valid ops header; 503 without header when lockdown on; deployment ID matches post-redeploy build |
| **FAIL** | 503 with valid header post-redeploy; env name missing; deployment predates env save; secret material in evidence |
| **BLOCKED** | HTTP not executed; token not provisioned; redeploy not done; authorization phrase missing |
| **INCONCLUSIVE** | Wrong surface (frontend 404 HTML on API path — historical L-11 note); correlation incomplete |

## 5. L-84M status

| Item | Status |
|------|--------|
| Runtime proof obtained | **NO** |
| HTTP proof executed | **NO** |

---

*End.*
