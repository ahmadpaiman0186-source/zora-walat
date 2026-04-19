/**
 * Intentionally NOT the process entrypoint for the HTTP API.
 *
 * The Express app factory lives in ./src/app.js.
 * Start the server with: npm start or node start.js (see package.json).
 *
 * This file exists so node app.js from server/ fails with a clear message
 * instead of MODULE_NOT_FOUND (common confusion with other Express layouts).
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
      'Start the API with: npm start,',
      '(runs: node start.js in this directory)',
      'Application factory: import { createApp } from "./src/app.js",',
    ].join('\n'),
  );
  process.exit(1);
}

export { createApp } from './src/app.js';