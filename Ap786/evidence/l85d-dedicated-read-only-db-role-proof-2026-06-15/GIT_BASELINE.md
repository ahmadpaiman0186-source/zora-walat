# L-85D — Git baseline

**Executed:** 2026-06-15 (gate session)

## Preflight

| Check | Result |
|-------|--------|
| `git fetch --prune` | OK |
| `git switch main` | OK |
| `git pull --ff-only origin main` | OK — up to date |
| `L85C_COMMIT_IN_MAIN` (`13f262f`) | **YES** |
| `server/.vercel` absent | **YES** |
| `npm --prefix server run secrets:scan` | OK (final validation re-run at gate stop) |

## Branch / HEAD

| Field | Value |
|-------|-------|
| Branch | `main` |
| HEAD | `96e7e96` — Merge pull request #262 (L-85C evidence) |
| L-85C commit | `13f262f` — docs(ap786): record L-85C staging DB identity attestation boundary |

## Recent history (oneline, -12)

```
96e7e96 Merge pull request #262 from .../evidence/l85c-operator-redacted-vercel-staging-database-url-identity-attestation-2026-06-15
13f262f docs(ap786): record L-85C staging DB identity attestation boundary
72a2d55 Merge pull request #261 from .../evidence/l85b-staging-database-url-identity-read-only-db-role-proof-2026-06-15
792237f docs(ap786): record L-85B staging DB identity proof boundary
b171643 Merge pull request #260 from .../evidence/l85a-direct-db-audit-zero-write-verification-2026-06-15
3f165d6 docs(ap786): record L-85A direct DB audit zero-write verification
80429e0 Merge pull request #259 from .../evidence/l84zz-post-l84zy-side-effect-audit-db-boundary-2026-06-15
daf405a docs(ap786): record L-84ZZ side-effect audit DB boundary
33f9d56 Merge pull request #258 from .../evidence/l84zy-controlled-checkout-negative-post-runtime-reprobe-2026-06-15
172ffa5 docs(ap786): record L-84ZY checkout negative POST runtime proof
66bddea Merge pull request #257 from .../evidence/l84zx-post-l84zw-merge-deployment-binding-read-only-2026-06-15
e6b9569 docs(ap786): record L-84ZX deployment binding proof
20fb4fa Merge pull request #256 from .../fix/l84zw-checkout-api-routing-bridge-local-proof-2026-06-15
68e8ebf fix(api): add checkout routing bridge local proof
```

---

*End.*
