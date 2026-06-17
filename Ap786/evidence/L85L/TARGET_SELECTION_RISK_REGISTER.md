# L-85L — Target selection risk register

Target selection for Vercel `READ_ONLY_DATABASE_URL` binding and HTTP proof remains a **critical risk** until operator/Vercel UI evidence proves project linkage.

**L-85L status:** No target proven — **`zora-walat-api-staging`** remains **INFERRED**.

---

## 1) Risk summary

| Risk ID | Description | Severity | L-85L mitigation |
|---------|-------------|----------|------------------|
| TSR-01 | Wrong Vercel project receives read-only URL | **Critical** | Authorization gate blocks mutation |
| TSR-02 | Frontend project bound instead of API | **Critical** | Risk register + operator checklist |
| TSR-03 | Production project bound on first attempt | **Critical** | Staging-only policy in authorization gate |
| TSR-04 | Env set but deploy root lacks `/ops/db-readonly-proof` | **High** | Operator UI root-directory proof in L-85M |
| TSR-05 | Preview deployment tested instead of staging alias | **Medium** | Explicit environment attestation |
| TSR-06 | Ambiguous project name collision | **Medium** | Exact name match required |

---

## 2) Candidate targets

| Project name | Role | Selection status | Proof target? |
|--------------|------|------------------|-------------|
| **`zora-walat-api-staging`** | Staging API (repo-tracked references in tools/scripts) | **INFERRED** first candidate | **YES** — after L-85M authorization |
| **`zora-walat-api`** | Production API (`server/package.json` name) | Possible API project — **NOT selected** without separate authorization | **NO** for first bind |
| **`zora-walat`** | Frontend / root Next.js (`package.json` name) | Frontend candidate | **NO** — lacks full ops route graph unless separately justified |
| **Other preview projects** | Unknown linkage | Not repo-proven | **NO** unless operator proves route ownership |

---

## 3) Repo evidence for inference (structural only)

| Signal | Inference |
|--------|-------------|
| `server/package.json` `"name": "zora-walat-api"` | API package identity |
| `server/scripts/assert-vercel-api-deploy-root.mjs` | API deploy must run from `server/` |
| Staging operator tools reference staging API project name | Staging API project candidate |
| Root `vercel.json` Next.js | Separate frontend deploy path |

**Gap:** Tracked repo does not contain Vercel project ID ↔ directory binding file provable without operator UI.

---

## 4) Stop conditions (future L-85M)

Future proof **must NOT proceed** if:

| Condition | Action |
|-----------|--------|
| Target project name ambiguous | **STOP** — resolve before bind |
| Operator cannot confirm API root directory | **STOP** |
| Staging vs production uncertain | **STOP** |
| Authorization record missing | **STOP** |
| Expected endpoint path not on target deploy graph | **STOP** |

---

## 5) Target proof requirements (future L-85M)

Operator must capture (structural — no secrets):

| Evidence | Purpose |
|----------|---------|
| Vercel project name screenshot or CLI project list (redacted) | Project identity |
| Root Directory setting | Confirms API vs frontend |
| Environment scope (Staging) | Confirms tier |
| Domain/alias name (if visible) | Cross-check staging API |

Mark as **operator-observed** unless repo-tracked.

---

## 6) L-85L target verdict

| Question | Answer |
|----------|--------|
| Target proven from repo alone | **NO** |
| Best candidate | **`zora-walat-api-staging`** |
| Target status | **INFERRED** |

---

*End.*
