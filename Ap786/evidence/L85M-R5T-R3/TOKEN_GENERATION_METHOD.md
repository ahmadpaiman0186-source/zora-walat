# L-85M-R5T-R3 — Token generation method

**Gate UTC:** 2026-06-20

---

| Field | Value |
|-------|--------|
| Method | Node.js `crypto.randomBytes(32)` |
| Encoding | `.toString('hex')` |
| Result length | **64 hex characters** (≥16 minimum per tracked auth contract) |
| Token printed to terminal | **NO** |
| Token written to repo/chat/evidence | **NO** |
| Delivery path | Stdin pipe to `vercel env add`; same value assigned to Process-scoped `$env:OPS_HEALTH_TOKEN` |
| Local shape check (metadata) | **64** chars; **no newline** detected — value **not** recorded |

Generation performed in gate execution shell; ephemeral `$token` variable cleared after Vercel upload while Process env retained.

---

*End.*
