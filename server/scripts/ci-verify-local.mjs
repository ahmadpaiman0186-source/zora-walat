/**
 * Strongest local verification of CI-like steps without GitHub Actions.
 * Requires PostgreSQL for migrate + integration; uses TEST_DATABASE_URL when set else DATABASE_URL.
 *
 * Usage (from server/): npm run verify:ci-local
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'path';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(label, cmd, args, shell = process.platform === 'win32') {
  console.error(`\n[verify:ci-local] === ${label} ===\n`);
  const r = spawnSync(cmd, args, { cwd: serverRoot, stdio: 'inherit', shell });
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) {
    console.error(`[verify:ci-local] FAILED: ${label} (exit ${code})`);
    process.exit(code);
  }
}

run('test:integration:preflight', 'npm', ['run', 'test:integration:preflight']);
run('db:migrate:integration', 'npm', ['run', 'db:migrate:integration']);
run('test:ci', 'npm', ['run', 'test:ci']);

console.error(
  '\n[verify:ci-local] OK — this is local proof only; still confirm GitHub Actions on push.\n',
);
process.exit(0);
