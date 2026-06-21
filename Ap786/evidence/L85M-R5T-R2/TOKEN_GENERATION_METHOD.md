# L-85M-R5T-R2 — Token generation method

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
| Local length check (metadata) | **64** — no newline characters detected |

Generation performed in gate execution shell; ephemeral `$token` variable cleared after Vercel upload while Process env retained.

---

*End.*
