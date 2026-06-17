# L-85U — L-85M blocker reassessment

**Compared to:** [L-85T L85M retry preconditions](../L85T/L85M_RETRY_PRECONDITIONS.md)  
**Updated:** Definitive operator attestation supplement (2026-06-17)

---

## Blocker status after L-85U (definitive)

| Blocker (L-85T) | Prior status | After L-85U |
|-----------------|--------------|-------------|
| B1 — `READ_ONLY_DATABASE_URL` staging bind proof | **OPEN** (NOT PROVEN) | **OPEN** — operator attests key **ABSENT** (All Environments search) |
| B2 — Authenticated runtime proof | **OPEN** | **OPEN** — not performed |
| B3 — `OPS_HEALTH_TOKEN` staging availability | **OPEN** (NOT VERIFIED) | **PARTIAL** — key **PRESENT** on **Production** scope; value not used/verified |

---

## What L-85U cleared

| Item | Status |
|------|--------|
| Env value disclosure during inspection | **CLEAR** — operator attested NO exposure |
| Env mutation during inspection | **CLEAR** — operator attested NO mutation |
| Gate hygiene FAIL | **NO** |
| `OPS_HEALTH_TOKEN` key name presence | **CONFIRMED YES** (Production) |

---

## What L-85U did not clear

| Item | Status |
|------|--------|
| `READ_ONLY_DATABASE_URL` key on staging | **ABSENT** — **primary L-85M blocker** |
| Secret value validity (either key) | **NOT PROVEN** |
| Runtime env binding on active deployment | **NOT PROVEN** |
| L-85M authorization | **NOT GRANTED** |

---

## Recommendation

| Action | Recommendation |
|--------|----------------|
| Run L-85M now | **NO** |
| Run authenticated staging proof | **NO** |
| Deploy/redeploy for env pickup | **NO** (not authorized; readonly key absent) |

### Remediation path (operator — separate authorization gate)

1. Operator authorizes adding **`READ_ONLY_DATABASE_URL`** on **`zora-walat-api-staging`** only (L-85L pattern).
2. Value from secure storage — **never** in chat or evidence.
3. Optional redeploy attestation after bind (separate gate).
4. Re-attest key presence (names only).
5. Then authorize **L-85M** authenticated staging runtime proof.

**Block reason:** `READ_ONLY_DATABASE_URL` absent from `zora-walat-api-staging`.

---

*End.*
