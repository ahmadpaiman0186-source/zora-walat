/**
 * Intentionally NOT the process entrypoint for the HTTP API.
 *
 * Runtime exports for tooling live in `./src/index.js`.
 * Start the server with: `npm start` or `node start.js` (see package.json).
 *
 * This file exists so `node index.js` from `server/` fails with a clear message
 * instead of MODULE_NOT_FOUND.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const runAsMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (runAsMain) {
  console.error(
    [
      '[zora-walat-api] Wrong entrypoint.',
      '  Start the API with:  npm start',
      '  (runs: node start.js in this directory)',
      '  Library exports: import { startApiRuntime } from "./src/index.js"',
    ].join('\n'),
  );
  process.exit(1);
}

export {
  createValidatedApp,
  startApiRuntime,
  startBackgroundWorkerRuntime,
  validateServerRuntimeOrExit,
  getRuntimeKind,
  RUNTIME_KIND,
  setRuntimeKind,
  assertWorkerRuntimeOrThrow,
  assertHttpAppConstructionAllowedOrThrow,
} from './src/index.js';
