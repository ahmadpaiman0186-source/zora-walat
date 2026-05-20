/**
 * Staging operator auth env + token diagnostics (no secrets).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  accessTokenExpiryIso,
  classifyStoredToken,
  credentialEnvDiagnostics,
  isAccessTokenExpired,
  readOperatorEmail,
  readOperatorPassword,
} from '../tools/stagingOperatorAuthEnv.mjs';

const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function makeJwtWithExp(expUnix) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify({ exp: expUnix })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('stagingOperatorAuthEnv', () => {
  it('credentialEnvDiagnostics reports presence without values', () => {
    const d = credentialEnvDiagnostics({
      STAGING_OPERATOR_EMAIL: 'op@example.com',
      STAGING_OPERATOR_PASSWORD: 'abcdefghij',
    });
    assert.equal(d.hasEmail, true);
    assert.equal(d.hasPassword, true);
    assert.equal(d.passwordLength, 10);
    assert.equal(readOperatorPassword({ STAGING_OPERATOR_PASSWORD: 'x' }), 'x');
  });

  it('isAccessTokenExpired detects past exp', () => {
    const past = makeJwtWithExp(Math.floor(Date.now() / 1000) - 3600);
    assert.equal(isAccessTokenExpired(past), true);
    const future = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    assert.equal(isAccessTokenExpired(future), false);
  });

  it('classifyStoredToken returns missing for empty', () => {
    assert.equal(classifyStoredToken(''), 'missing');
    assert.equal(classifyStoredToken('a.b.c'), 'present_unknown_exp');
  });

  it('accessTokenExpiryIso returns ISO string when exp present', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const iso = accessTokenExpiryIso(makeJwtWithExp(exp));
    assert.ok(iso && iso.endsWith('Z'));
  });
});

describe('staging-auth-checkout-operator auth-env-check (CLI)', () => {
  it('auth-env-check fails fast without password env (no hang)', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/staging-auth-checkout-operator.mjs', 'auth-env-check'],
      {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          STAGING_OPERATOR_EMAIL: 'op@example.com',
          STAGING_OPERATOR_PASSWORD: '',
        },
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.equal(r.status, 2);
    assert.match(out, /HAS_PASSWORD false/);
    assert.match(out, /WINDOWS_POWERSHELL_EXAMPLE/);
    assert.ok(!out.includes('whsec_'));
    assert.ok(!out.includes('eyJ'));
  });

  it('login without password env exits 2 without hanging', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/staging-auth-checkout-operator.mjs', 'login'],
      {
        cwd: SERVER_ROOT,
        env: {
          ...process.env,
          STAGING_OPERATOR_EMAIL: 'op@example.com',
          STAGING_OPERATOR_PASSWORD: '',
        },
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    assert.equal(r.status, 2);
    assert.match(out, /LOCAL_VALIDATION_ERROR password_required/);
    assert.match(out, /LOGIN_SKIPPED true/);
  });
});
