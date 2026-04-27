/**
 * Cross-platform unit test entry: `test/*.test.js` is not expanded on Windows shells;
 * `node --test` is given an explicit file list. Excludes `test/integrations/**` (use `test:integration`).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const testDir = join(serverRoot, 'test');
const files = readdirSync(testDir, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.test.js'))
  .map((e) => join('test', e.name))
  .sort();
if (files.length === 0) {
  console.error('[run-unit-tests] No test/*.test.js files in test/');
  process.exit(1);
}
const r = spawnSync(
  process.execPath,
  [
    '--import',
    './test/setupTestEnv.mjs',
    '--test',
    '--test-force-exit',
    '--test-concurrency=1',
    ...files,
  ],
  { cwd: serverRoot, stdio: 'inherit', shell: false },
);
process.exit(r.status === null ? 1 : r.status);
