# L-85V — Deployment pickup non-claim

---

## What is NOT claimed

| Claim | Status |
|-------|--------|
| Staging deployment redeployed | **NOT CLAIMED** — operator attested **NO** manual redeploy |
| Active runtime loads new `READ_ONLY_DATABASE_URL` | **NOT CLAIMED** |
| Env hot-reloaded on running deployment | **NOT CLAIMED** |
| `readonly_url_missing` would not occur on authenticated path | **NOT CLAIMED** |

## Vercel platform signal (operator attested)

Vercel indicated a **new deployment is required** for environment variable changes to take effect on the running staging API.

## Implication for L-85M

Even with key present in Vercel project settings, **authenticated runtime DB proof must not run** until a **separately authorized redeploy/pickup gate** confirms the active deployment has picked up Production env (structural attestation only — no DB proof in pickup gate unless separately authorized).

---

*End.*
