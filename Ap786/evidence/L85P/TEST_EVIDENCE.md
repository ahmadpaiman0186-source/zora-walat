# L-85P — Test evidence

**Gate UTC:** 2026-06-17

---

## Commands run

```text
npm --prefix server run test:db-readonly-proof   # baseline before changes — PASS
npm --prefix server run secrets:scan             # baseline before changes — OK
npm --prefix server run test:prebootstrap-readonly-proof  # PASS (12/12)
npm --prefix server run test:db-readonly-proof   # PASS (10/10) — L-85K regression
npm --prefix server run secrets:scan             # OK
git diff --check                                 # (recorded at commit)
```

## `test:prebootstrap-readonly-proof` coverage

- Missing token → `token_missing`, `401`, full safe JSON contract
- Invalid token → `token_invalid`, `401`
- Unconfigured OPS token → `token_invalid`
- Valid token without readonly URL → `readonly_url_missing` (evaluate only)
- Valid token with readonly URL → `pass_through` (evaluate only; passThrough not run in blocked tests)
- Static review: guard avoids `dbReadonlyProofService`, Prisma, owner `db.js`, `process.env.DATABASE_URL`
- Static review: handler avoids DB proof imports
- Static review: `index.mjs` wires handler before Stripe slim block
- Child process: missing token does not invoke `passThrough` or DB proof service import
- Response leak scan: no token/password/url/host/connection-string patterns in blocked JSON

## `test:db-readonly-proof` (L-85K)

All 10 tests **PASS** — no regression.

## Not tested in this gate

- Live staging HTTP probe
- Authenticated DB proof
- `READ_ONLY_DATABASE_URL` runtime identity proof

---

*End.*
