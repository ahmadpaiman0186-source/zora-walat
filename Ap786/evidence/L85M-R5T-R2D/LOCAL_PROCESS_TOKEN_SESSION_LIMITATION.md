# L-85M-R5T-R2D — Local process token session limitation

**Gate UTC:** 2026-06-20  
**Source:** R5T-R2 on `main`

---

| Field | Status |
|-------|--------|
| R5T-R2 Process-scoped token set | **Recorded at alignment gate** |
| Token value in evidence | **NO** |
| Session persistence | **NOT ASSUMED** in this gate |
| Deployment pickup resolves local token gap | **NO** |

Even with **READY** deployment metadata observed, authenticated proof retry still requires a matching Process-scoped token in an **active session** or a **separate re-alignment gate** if the session was lost.

---

*End.*
