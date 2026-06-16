# L-85G — Secret non-disclosure attestation

| Item | Status |
|------|--------|
| `READ_ONLY_DATABASE_URL` in evidence | **NO** |
| `DATABASE_URL` used for probe | **NO** |
| Password in output | **NO** |
| Host in evidence | **NO** |
| Full connection string in evidence | **NO** |
| `$executeRaw` | **NOT USED** |
| DML/DDL executed | **NO** |
| Ephemeral script retained | **NO** — deleted after run |

**Note:** Operator `.env.local` value contained a leading prefix/quote artifact; probe extracted `postgresql://…` substring in-process without logging the URL. Operator should normalize the env value to a plain `postgresql://…` string (no extra prefix/quotes).

---

*End.*
