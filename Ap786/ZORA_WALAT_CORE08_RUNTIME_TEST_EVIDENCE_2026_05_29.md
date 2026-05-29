# CORE-08 Runtime Test Evidence

**Date:** 2026-05-29  
**Command:** `npm run test:safe-repair-dry-run` (from `server/`)

---

## Fixture map (a–j)

| Fixture | Scenario | Expected class |
|---------|----------|----------------|
| a | Missing audit metadata | B |
| b | Stale pending order | B |
| c | Paid, provider missing | C |
| d | Provider timeout/ambiguous | C |
| e | Duplicate provider execution | D |
| f | Missing idempotency key | D |
| g | Completed without provider proof | C |
| h | Refund candidate | C |
| i | Wallet correction candidate | C |
| j | Clean no-repair | (no plans) PASS |
| + | Provider retry after ambiguous | D |
| + | CLI `--apply` | exit 2 |

---

## Validation run (2026-05-29)

```
npm run test:safe-repair-dry-run
# tests 14 | pass 14 | fail 0 | duration_ms ~450
```

CLI:

```
node tools/zw-doctor.mjs repair-dry-run --apply
# exit 2 — apply forbidden
```

---

## Not proven

- Repair apply workflow  
- Production self-healing  
- Operator DR execution  

---

*End of test evidence.*
