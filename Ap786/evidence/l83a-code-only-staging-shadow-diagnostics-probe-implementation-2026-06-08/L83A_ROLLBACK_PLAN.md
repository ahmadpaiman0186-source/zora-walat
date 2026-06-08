# L-83A — Rollback plan (implementation)

## Immediate disable (preferred)

On staging project only:

1. Set `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false` (or unset)
2. Redeploy staging API (separate operator approval — **not done in this step**)
3. Confirm route returns 404

Production: keep flag unset — route fails closed to 404 even if code present.

## Code rollback

Revert implementation commit(s):

- Remove route mount from `app.js`
- Delete `stagingProbeDiagnostics.js`, route file, tests
- Remove env keys from `env.js` if fully rolling back

Run shadow test bundle + `secrets:scan`.

---

*End.*
