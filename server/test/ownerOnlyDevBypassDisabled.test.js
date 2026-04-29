import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const childFile = join(__dirname, 'helpers', 'ownerOnlyDevBypassDisabledChild.test.js');
const serverRoot = join(__dirname, '..');

describe('owner-only disables dev bypass (isolated subprocess)', () => {
  it('does not authenticate via X-ZW-Dev-Checkout when OWNER_ALLOWED_EMAIL is set', () => {
    const r = spawnSync(process.execPath, ['--test', childFile], {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PRELAUNCH_LOCKDOWN: 'false',
        OWNER_ALLOWED_EMAIL: 'owner-only-enforced@example.test',
        JWT_ACCESS_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'y'.repeat(32),
        DEV_CHECKOUT_AUTH_BYPASS: 'true',
        DEV_CHECKOUT_BYPASS_SECRET: 'dev-bypass-secret-16chars-min',
        DEV_CHECKOUT_BYPASS_USER_ID: '00000000-0000-0000-0000-000000000001',
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
