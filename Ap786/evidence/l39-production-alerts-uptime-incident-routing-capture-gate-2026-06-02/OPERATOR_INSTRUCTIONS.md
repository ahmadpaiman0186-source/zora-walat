# L-39 — Operator instructions

**Date:** 2026-06-02
**Gate:** CORE10-L39-CAPTURE-GATE-001

---

## Operator must

1. Capture **production** alert, uptime, incident, logs, money-path, drill, and sign-off artifacts **manually**.
2. Redact per [REDACTION_POLICY.md](./REDACTION_POLICY.md) **before** adding to repo.
3. Use exact filenames from [REQUIRED_SCREENSHOT_MANIFEST.md](./REQUIRED_SCREENSHOT_MANIFEST.md).
4. Place PNGs in [screenshots-redacted/](./screenshots-redacted/).
5. Confirm production scope (not `*-staging*`, not Stripe sandbox for money-path).

---

## Operator must not

| Forbidden | Reason |
|-----------|--------|
| Production/staging API probe | Runtime |
| Deploy / redeploy | Runtime |
| Token refresh / login automation | Credentials |
| `cat .env.local` / `.staging-token.local` | Secrets |
| Env edit | Mutation |
| Reuse L-38 Vercel deploy PNGs as alert/uptime proof | Scope fraud |
| Fabricate screenshots or sign-off | Proof fraud |

---

## After filing

Request separate **L-40** (or authorized) intake session to evaluate filed PNGs against [PASS_FAIL_CRITERIA.md](./PASS_FAIL_CRITERIA.md).

---

*Instructions do not constitute proof.*
