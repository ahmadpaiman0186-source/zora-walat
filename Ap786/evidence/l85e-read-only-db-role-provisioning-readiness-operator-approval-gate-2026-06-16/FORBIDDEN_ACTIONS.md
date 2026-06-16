# L-85E — Forbidden actions

**Applies to:** L-85E and default boundary for L-85F until explicitly approved.

---

## Runtime / network

| Action | L-85E | L-85F default |
|--------|-------|---------------|
| HTTP POST (checkout/webhook) | **FORBIDDEN** | **FORBIDDEN** unless separate L-step |
| Stripe / provider API or dashboard | **FORBIDDEN** | **FORBIDDEN** |
| Redeploy | **FORBIDDEN** | **FORBIDDEN** unless separate approval |

## Database

| Action | L-85E | L-85F (if approved) |
|--------|-------|---------------------|
| SELECT against live DB | **FORBIDDEN** | L-85G only for privilege probe |
| CONNECT using `DATABASE_URL` | **FORBIDDEN** | Operator session only |
| CONNECT using `TEST_DATABASE_URL` | **FORBIDDEN** | **FORBIDDEN** in audit gates |
| INSERT / UPDATE / DELETE | **FORBIDDEN** | **FORBIDDEN** |
| CREATE ROLE / GRANT / REVOKE | **FORBIDDEN** | L-85F only with approval phrase |
| ALTER / DROP / TRUNCATE | **FORBIDDEN** | **FORBIDDEN** |
| Migration | **FORBIDDEN** | **FORBIDDEN** |

## Secrets / env

| Action | Status |
|--------|--------|
| `vercel env pull` | **FORBIDDEN** in L-85E |
| Vercel env update | **FORBIDDEN** in L-85E |
| Full `DATABASE_URL` print | **FORBIDDEN** |
| Password / token in evidence | **FORBIDDEN** |
| `.env` / `.env.local` dump | **FORBIDDEN** |

## Claims

| Claim | Status |
|-------|--------|
| Read-only DB role exists | **FORBIDDEN** in L-85E |
| Staging DATABASE_URL identity proven | **FORBIDDEN** |
| Staging DB zero-write | **FORBIDDEN** |
| Payment / provider / money / market / global | **FORBIDDEN** |

---

*End.*
