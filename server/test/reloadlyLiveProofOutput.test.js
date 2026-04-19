import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const script = join(serverRoot, 'scripts', 'reloadly-phase1-live-proof.mjs');

describe('reloadly-phase1-live-proof JSON contract', () => {
  it('emits reloadlyProofMaturityClass credentials_missing when Reloadly creds are blank', () => {
    const r = spawnSync(process.execPath, [script], {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        RELOADLY_CLIENT_ID: '',
        RELOADLY_CLIENT_SECRET: '',
      },
      encoding: 'utf-8',
    });
    assert.equal(r.status, 2, r.stderr || r.stdout);
    const lines = r.stdout.trim().split('\n').filter((l) => l.startsWith('{'));
    assert.ok(lines.length >= 1, r.stdout);
    const j = JSON.parse(lines[lines.length - 1]);
    assert.equal(j.reloadlyProofMaturityClass, 'credentials_missing');
    assert.equal(j.proofTier, 'credentials_missing');
    assert.equal(typeof j.operatorMapKeyCount, 'number');
  });
});
