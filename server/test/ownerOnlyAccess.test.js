import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const childFile = join(__dirname, 'helpers', 'ownerOnlyAccessChild.test.js');
const serverRoot = join(__dirname, '..');

describe('owner-only access (isolated subprocess)', () => {
  it('enforces OWNER_ALLOWED_EMAIL across auth and protected routes', () => {
    const r = spawnSync(process.execPath, ['--test', childFile], {
      cwd: serverRoot,
      env: {
        ...process.env,
        OWNER_ALLOWED_EMAIL: 'ahmadpaimaiman0186@gmail.com',
        PRELAUNCH_LOCKDOWN: 'false',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'a'.repeat(32),
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'b'.repeat(32),
      },
      encoding: 'utf-8',
    });
    if (r.status !== 0) {
      // eslint-disable-next-line no-console
      console.error(r.stdout);
      // eslint-disable-next-line no-console
      console.error(r.stderr);
    }
    assert.equal(r.status, 0, r.stderr || r.stdout || 'subprocess failed');
  });
});
