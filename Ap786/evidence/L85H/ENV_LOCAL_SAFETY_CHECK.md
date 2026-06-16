# L-85H — Env local safety check (no secret values)

**Target:** gitignored `server/.env.local` key **`READ_ONLY_DATABASE_URL`**  
**Method:** Operator safe-check — **values not printed or filed**

---

## Safe-check results (operator-attested)

| Check | Result |
|-------|--------|
| `URI_PARSE` | **PASS** |
| `SCHEME` | **PASS** |
| `ROLE_USERINFO` | **PASS** |
| `PASSWORD_PRESENT` | **YES** (boolean only — password not recorded) |
| `DIRECT_NON_POOLER_HOST` | **PASS** |
| `DB_PATH` | **PASS** |
| `SSL_MODE` | **PASS** |
| `CHANNEL_BINDING` | **YES** |

## Git ignore / track status

| Check | Result |
|-------|--------|
| Ignored by git | **YES** — `server/.gitignore:32:.env*.local` |
| Tracked by git | **NO** — `git ls-files server/.env.local` empty |

## Not performed in safe-check filing

- Raw `.env.local` dump
- Full connection string export
- Hostname in evidence
- DB connect / SELECT probe (optional future gate only)

---

*End.*
