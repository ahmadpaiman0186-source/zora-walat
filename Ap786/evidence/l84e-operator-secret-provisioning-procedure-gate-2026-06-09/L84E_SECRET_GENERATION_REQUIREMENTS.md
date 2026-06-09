# L-84E — Secret generation requirements

**Procedure gate only — no generation in this step.**

## OPS token requirements

| Rule | Requirement |
|------|-------------|
| Entropy | **High-entropy** random string (≥32 chars recommended; minimum **16** per server gate) |
| Weak tokens | **Forbidden** — no dictionary words, dates, project names, or sequential patterns |
| Reuse | Do not reuse tokens from other projects or production |
| Storage | **Never** commit to repo, `.env` tracked files, Ap786 evidence, chat, or screenshots |

## Generation methods (operator — outside repo)

| Method | Notes |
|--------|-------|
| Password manager / secrets vault | Preferred |
| OS CSPRNG | e.g. cryptographically secure random generator |
| Vercel UI paste-on-add | Value entered once in UI; never copied into evidence |

## Evidence allowed after future provisioning

| Field | Allowed record |
|-------|----------------|
| `OPS_HEALTH_TOKEN` on staging | **PRESENT** |
| Value | **REDACTED / NOT RECORDED** |

## Forbidden in evidence

- Token string or substring
- Token length beyond yes/no presence
- Base64/hex dumps resembling live secrets

---

*End.*
