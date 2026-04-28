import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const childFile = join(__dirname, 'helpers', 'prelaunchPrivateSurfaceChild.test.js');
const serverRoot = join(__dirname, '..');

/**
 * PRELAUNCH_LOCKDOWN is evaluated at env module load; run assertions in a subprocess with
 * lockdown + JWT + Stripe webhook env set before imports.
 */
describe('prelaunch private surface (isolated subprocess)', () => {
  it('validates lockdown gates with a clean module graph', () => {
    const r = spawnSync(process.execPath, ['--test', childFile], {
      cwd: serverRoot,
      env: {
        ...process.env,
        PRELAUNCH_LOCKDOWN: 'true',
        PRELAUNCH_ALLOW_PUBLIC_REGISTRATION: 'false',
        CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
        STRIPE_WEBHOOK_SECRET: `whsec_${'a'.repeat(24)}`,
        JWT_ACCESS_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'y'.repeat(32),
        NODE_ENV: 'development',
        OPS_HEALTH_TOKEN: 'ops-token-test-16chars-min',
        DEV_CHECKOUT_AUTH_BYPASS: 'true',
        DEV_CHECKOUT_BYPASS_SECRET: 'dev-bypass-secret-16chars-min',
        DEV_CHECKOUT_BYPASS_USER_ID: '00000000-0000-0000-0000-000000000001',
        OWNER_ALLOWED_EMAIL: '',
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

  it('prelaunch allows owner bootstrap register when OWNER_ALLOWED_EMAIL matches', () => {
    const ownerChild = join(__dirname, 'helpers', 'prelaunchOwnerBootstrapChild.test.js');
    const r = spawnSync(process.execPath, ['--test', ownerChild], {
      cwd: serverRoot,
      env: {
        ...process.env,
        PRELAUNCH_LOCKDOWN: 'true',
        PRELAUNCH_ALLOW_PUBLIC_REGISTRATION: 'false',
        OWNER_ALLOWED_EMAIL: 'ahmadpaimaiman0186@gmail.com',
        CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
        STRIPE_WEBHOOK_SECRET: `whsec_${'a'.repeat(24)}`,
        JWT_ACCESS_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'y'.repeat(32),
        NODE_ENV: 'development',
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
