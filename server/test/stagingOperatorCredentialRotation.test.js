/**
 * Guarded staging operator credential rotation — unit tests (no live DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertRotationOutputSanitized,
  assessApprovalPhrase,
  assessStagingRotationGuard,
  BCRYPT_ROUNDS,
  databaseUrlUsable,
  lookupOperatorUser,
  ROTATION_APPROVAL_PHRASE,
  runCredentialRotationMode,
} from '../tools/stagingOperatorCredentialRotation.mjs';

function stagingEnv(overrides = {}) {
  return {
    NODE_ENV: 'development',
    VERCEL_ENV: 'preview',
    ZW_STAGING_CREDENTIAL_ROTATION: 'true',
    STAGING_API_BASE: 'https://zora-walat-api-staging.vercel.app',
    STAGING_OPERATOR_EMAIL: 'operator@example.com',
    STAGING_OPERATOR_PASSWORD: 'OldCompromisedPw1',
    STAGING_OPERATOR_NEW_PASSWORD: 'NewSecurePass9',
    DATABASE_URL:
      'postgresql://placeholder:placeholder@ep-staging-placeholder.neon.tech/neondb?sslmode=require',
    ...overrides,
  };
}

function captureEmit() {
  /** @type {string[]} */
  const lines = [];
  const emit = (key, value) => {
    lines.push(`${key} ${value}`);
  };
  return { lines, emit, text: () => lines.join('\n') };
}

function mockPrisma({ users = [], connectOk = true, updateThrows = false } = {}) {
  return {
    async $queryRaw() {
      if (!connectOk) throw new Error('db_down');
      return [{ ok: 1 }];
    },
    user: {
      async findMany() {
        return users;
      },
      async update() {
        if (updateThrows) throw new Error('update_failed');
        return { id: users[0]?.id ?? 'u1' };
      },
    },
  };
}

describe('assessStagingRotationGuard', () => {
  it('blocks production-like host without staging arm', () => {
    const g = assessStagingRotationGuard({
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      STAGING_API_BASE: 'https://zora-walat-api.vercel.app',
    });
    assert.equal(g.stagingOnlyOk, false);
    assert.equal(g.productionBlocked, true);
  });

  it('allows staging when armed', () => {
    const g = assessStagingRotationGuard(stagingEnv());
    assert.equal(g.stagingOnlyOk, true);
    assert.equal(g.productionBlocked, false);
  });
});

describe('assessApprovalPhrase', () => {
  it('requires exact phrase for execute', () => {
    assert.equal(assessApprovalPhrase({}).exactMatch, false);
    assert.equal(
      assessApprovalPhrase({
        STAGING_OPERATOR_ROTATION_APPROVAL: ROTATION_APPROVAL_PHRASE,
      }).exactMatch,
      true,
    );
    assert.equal(
      assessApprovalPhrase({
        STAGING_OPERATOR_ROTATION_APPROVAL: 'wrong phrase',
      }).exactMatch,
      false,
    );
  });
});

describe('lookupOperatorUser', () => {
  it('reports ambiguous when multiple rows', async () => {
    const r = await lookupOperatorUser(
      mockPrisma({
        users: [
          { id: 'a', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
          { id: 'b', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
        ],
      }),
      'operator@example.com',
    );
    assert.equal(r.lookup, 'ambiguous');
    assert.equal(r.matchCount, 2);
  });
});

describe('runCredentialRotationMode diagnose', () => {
  it('diagnose output is sanitized', async () => {
    const { emit, text } = captureEmit();
    const env = stagingEnv();
    const code = await runCredentialRotationMode({
      mode: 'diagnose',
      emit,
      env,
      prisma: mockPrisma({
        users: [
          { id: 'cid12345678', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
        ],
      }),
    });
    assert.equal(code, 0);
    assert.match(text(), /OPERATOR_USER_LOOKUP found/);
    assert.match(text(), /DATABASE_URL_PRINTED false/);
    assert.match(text(), /STAGING_DB_REACHABLE true/);
    assert.doesNotThrow(() => assertRotationOutputSanitized(text(), env));
  });

  it('handles missing DATABASE_URL safely', async () => {
    const { emit, text } = captureEmit();
    const env = stagingEnv({ DATABASE_URL: '' });
    const code = await runCredentialRotationMode({
      mode: 'diagnose',
      emit,
      env,
      prisma: null,
    });
    assert.equal(code, 0);
    assert.match(text(), /STAGING_DB_REACHABLE false/);
    assert.match(text(), /OPERATOR_USER_LOOKUP error/);
  });
});

describe('runCredentialRotationMode dry-run', () => {
  it('performs no DB mutation', async () => {
    let updated = false;
    const prisma = mockPrisma({
      users: [
        { id: 'u1', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
      ],
    });
    prisma.user.update = async () => {
      updated = true;
      return {};
    };
    const { emit, text } = captureEmit();
    const code = await runCredentialRotationMode({
      mode: 'dry-run',
      emit,
      env: stagingEnv(),
      prisma,
    });
    assert.equal(code, 0);
    assert.equal(updated, false);
    assert.match(text(), /DRY_RUN_VERDICT PASS/);
    assert.match(text(), /DRY_RUN_DB_WRITE false/);
    assert.match(text(), /DB_WRITE_PERFORMED false/);
  });

  it('blocks when approval phrase is set', async () => {
    const { emit, text } = captureEmit();
    const code = await runCredentialRotationMode({
      mode: 'dry-run',
      emit,
      env: stagingEnv({
        STAGING_OPERATOR_ROTATION_APPROVAL: ROTATION_APPROVAL_PHRASE,
      }),
      prisma: mockPrisma({
        users: [
          { id: 'u1', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
        ],
      }),
    });
    assert.equal(code, 1);
    assert.match(text(), /DRY_RUN_VERDICT BLOCKED/);
  });
});

describe('runCredentialRotationMode execute', () => {
  it('blocks without exact approval phrase', async () => {
    const { emit, text } = captureEmit();
    const code = await runCredentialRotationMode({
      mode: 'execute',
      emit,
      env: stagingEnv(),
      prisma: mockPrisma({
        users: [
          { id: 'u1', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
        ],
      }),
      readNewPassword: async () => 'NewSecurePass9',
    });
    assert.equal(code, 1);
    assert.match(text(), /EXECUTE_VERDICT BLOCKED/);
    assert.match(text(), /CREDENTIAL_ROTATION_EXECUTED false/);
    assert.match(text(), /EXECUTE_MODE_RUN false/);
  });

  it('blocks ambiguous user', async () => {
    const { emit, text } = captureEmit();
    const code = await runCredentialRotationMode({
      mode: 'execute',
      emit,
      env: stagingEnv({
        STAGING_OPERATOR_ROTATION_APPROVAL: ROTATION_APPROVAL_PHRASE,
      }),
      prisma: mockPrisma({
        users: [
          { id: 'u1', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
          { id: 'u2', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
        ],
      }),
      readNewPassword: async () => 'NewSecurePass9',
    });
    assert.equal(code, 1);
    assert.match(text(), /lookup_ambiguous/);
    assert.match(text(), /CREDENTIAL_ROTATION_EXECUTED false/);
  });

  it('updates hash when approved without printing password', async () => {
    let capturedHash = '';
    const env = stagingEnv({
      STAGING_OPERATOR_ROTATION_APPROVAL: ROTATION_APPROVAL_PHRASE,
    });
    const prisma = mockPrisma({
      users: [
        { id: 'u1', isActive: true, emailVerifiedAt: new Date(), role: 'user' },
      ],
    });
    prisma.user.update = async ({ data }) => {
      capturedHash = data.passwordHash;
      return {};
    };
    const { emit, text } = captureEmit();
    const code = await runCredentialRotationMode({
      mode: 'execute',
      emit,
      env,
      prisma,
      readNewPassword: async () => env.STAGING_OPERATOR_NEW_PASSWORD,
      tokenPath: null,
    });
    assert.equal(code, 0);
    assert.ok(capturedHash.length > 20);
    assert.match(text(), /CREDENTIAL_ROTATION_EXECUTED true/);
    assert.match(text(), /NEW_PASSWORD_WILL_BE_PRINTED false/);
    assert.doesNotThrow(() => assertRotationOutputSanitized(text(), env));
    assert.ok(!text().includes(env.STAGING_OPERATOR_NEW_PASSWORD));
    assert.ok(!text().includes(env.STAGING_OPERATOR_PASSWORD));
    assert.equal(BCRYPT_ROUNDS, 12);
  });
});

describe('databaseUrlUsable', () => {
  it('rejects short placeholder URLs', () => {
    assert.equal(databaseUrlUsable('postgres://x'), false);
    const longPlaceholder = `postgresql://placeholder:placeholder@${'x'.repeat(40)}.neon.tech/neondb?sslmode=require`;
    assert.ok(longPlaceholder.length >= 80);
    assert.equal(databaseUrlUsable(longPlaceholder), true);
  });
});
