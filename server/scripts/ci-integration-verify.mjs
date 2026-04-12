/**
 * Repo-supported integration path for CI-like environments.
 * Requires TEST_DATABASE_URL (dedicated Postgres); runs preflight, migrate against that URL, then test:integration.
 *
 * Usage (from server/): npm run ci:integration-verify
 * Windows/macOS/Linux: uses npm as subprocess with shell for portability when invoked via npm script.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!String(process.env.TEST_DATABASE_URL ?? '').trim()) {
  console.error(
    '[ci-integration-verify] TEST_DATABASE_URL must be set to the integration Postgres URL (migrations applied by this script).',
  );
  process.exit(2);
}

function run(label, command, args) {
  console.error(`\n[ci-integration-verify] → ${label}\n`);
  const r = spawnSync(command, args, {
    cwd: serverRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) {
    console.error(`[ci-integration-verify] FAILED: ${label} (exit ${code})`);
    process.exit(code);
  }
}

run('preflight', 'npm', ['run', 'test:integration:preflight']);
run('migrate integration DB', 'npm', ['run', 'db:migrate:integration']);
run('unit + integration', 'npm', ['run', 'test:ci']);

console.error('\n[ci-integration-verify] OK — test:ci completed.\n');
process.exit(0);
