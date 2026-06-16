# L-85E — Secret handling rules

---

## Never file in Ap786 or git

- Full `DATABASE_URL` / `READ_ONLY_DATABASE_URL` values
- Passwords, tokens, API keys, JWTs
- `vercel env pull` output
- Raw `.env` / `.env.local` contents
- Customer PII or full table exports

## Safe to file (redacted metadata)

- Env var **names** (`READ_ONLY_DATABASE_URL`, `DATABASE_URL`)
- Boolean: present / absent, length bucket (e.g. ≥80 chars) — **optional; not required in L-85E**
- Neon **hostname** (pooler host is infrastructure metadata, not a password)
- Database name, port, SSL mode
- Role name (e.g. `zora_audit_ro`)
- `current_user` from SELECT metadata probes (L-85G)
- Privilege matrix booleans from `has_table_privilege`

## Operator dashboard (Vercel / Neon)

- Do **not** click Reveal/copy for live secrets into chat
- Vercel Sensitive vars may show placeholder only (per L-85C) — record that fact, not a guessed value
- Neon password: set in console; store in password manager or gitignored local file only

## CLI redaction

If terminal output might contain URLs:

- Redact `postgres://…` lines before logging
- Never commit terminal transcripts with credentials

## Validation

- `npm --prefix server run secrets:scan` on Ap786-only commits before push

---

*End.*
