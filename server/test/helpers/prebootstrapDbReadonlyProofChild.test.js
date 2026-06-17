/**
 * Child: dynamic import handler only — no dbReadonlyProofService on missing-token path.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const OPS = String(process.env.OPS_HEALTH_TOKEN ?? '').trim();
assert.ok(OPS.length >= 16);

const { handleSlimDbReadonlyProofPrebootstrapGet } = await import(
  '../handlers/slimDbReadonlyProofPrebootstrapHandler.mjs'
);

let dbProofImportAttempted = false;
const originalImport = globalThis.__proto__.constructor.prototype; // noop guard

describe('L-85P child prebootstrap', () => {
  it('missing token does not invoke passThrough or db proof service', async () => {
    let passThroughCalled = false;
    let dbProofImportAttempted = false;

    const resState = { statusCode: 0, body: null };
    const res = {
      setHeader() {},
      status(code) {
        resState.statusCode = code;
        return {
          json(b) {
            resState.body = b;
          },
        };
      },
    };

    await handleSlimDbReadonlyProofPrebootstrapGet(
      { headers: {}, url: '/ops/db-readonly-proof' },
      res,
      {
        route: '/ops/db-readonly-proof',
        deps: { readConfiguredOpsToken: () => OPS },
        passThrough: async () => {
          passThroughCalled = true;
          await import('../src/services/dbReadonlyProofService.js');
          dbProofImportAttempted = true;
        },
      },
    );

    assert.equal(passThroughCalled, false);
    assert.equal(dbProofImportAttempted, false);
    assert.equal(resState.body?.reason, 'token_missing');
  });
});
