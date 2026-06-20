# L-85M-R5T — Token generation method

**Gate UTC:** 2026-06-20

---

| Field | Value |
|-------|--------|
| Method | Node.js `crypto.randomBytes(32)` |
| Encoding | `.toString('hex')` |
| Result length | **64 hex characters** (≥16 minimum per tracked auth contract) |
| Token printed to terminal | **NO** |
| Token written to repo/chat/evidence | **NO** |
| Delivery path | Stdin pipe to `vercel env add` only |

Generation and upload performed in a single ephemeral process; token variable cleared after stdin write.

---

*End.*
