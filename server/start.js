/**
 * Local/dev process entry (authoritative): `npm start` → `node start.js`.
 *
 * `src/app.js` exports `createApp`; this file boots `startApiRuntime()`.
 * Root `app.js` / `index.js` are shims: clear errors if someone runs `node app.js`
 * expecting a listener, or re-exports for tooling — they do not bind the port.
 */
import './src/runtime/registerApiRuntime.js';
import './bootstrap.js';
import { startApiRuntime } from './src/index.js';

/**
 * `bootstrap.js` loads `server/.env` with `override: true` in non-production. If `.env` sets
 * `ZW_RUNTIME_KIND` (e.g. copied from worker docs), it would overwrite the value set by
 * `registerApiRuntime.js` and `startApiRuntime()` would hit `fatal_runtime_mismatch` and
 * `process.exit(1)`. The API entrypoint always wins.
 */
process.env.ZW_RUNTIME_KIND = 'api';

startApiRuntime();
