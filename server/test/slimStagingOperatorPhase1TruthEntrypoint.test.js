/**
 * Slim staging operator phase1-truth — routing, URL parse, incident normalize.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';

import {
  normalizePostPaymentIncidentStatus,
  orderIdFromStagingOperatorPhase1TruthUrl,
  STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX,
} from '../api/slimStagingOperatorPhase1TruthHandler.mjs';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';

describe('slimStagingOperatorPhase1TruthHandler URL parse', () => {
  it('extracts order id from path', () => {
    const id = 'cmp91xbrt0003jm04m9ub8wrw';
    assert.equal(
      orderIdFromStagingOperatorPhase1TruthUrl(
        `${STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX}${id}`,
      ),
      id,
    );
  });
});

describe('normalizePostPaymentIncidentStatus', () => {
  it('returns NONE for empty or unknown values', () => {
    assert.equal(normalizePostPaymentIncidentStatus(null), POST_PAYMENT_INCIDENT_STATUS.NONE);
    assert.equal(normalizePostPaymentIncidentStatus(''), POST_PAYMENT_INCIDENT_STATUS.NONE);
    assert.equal(normalizePostPaymentIncidentStatus('bogus'), POST_PAYMENT_INCIDENT_STATUS.NONE);
  });

  it('passes through allowed incident enums', () => {
    assert.equal(
      normalizePostPaymentIncidentStatus(POST_PAYMENT_INCIDENT_STATUS.REFUNDED),
      POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
    );
    assert.equal(
      normalizePostPaymentIncidentStatus('  REFUNDED  '),
      POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
    );
  });
});

describe('api/index.mjs GET staging-operator-phase1-truth routes before bootstrap', () => {
  it('returns quickly without bootstrap health-test hook', async () => {
    const events = [];
    const original = globalThis.__zwServerlessHealthTestHook;
    globalThis.__zwServerlessHealthTestHook = (e) => events.push(e);

    try {
      const { default: handler } = await import('../api/index.mjs');
      const req = Readable.from([]);
      req.method = 'GET';
      req.url = `${STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX}cmp91xbrt0003jm04m9ub8wrw`;
      req.headers = {};
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      const res = {
        statusCode: 200,
        headers: {},
        body: '',
        setHeader(k, v) {
          this.headers[String(k).toLowerCase()] = v;
        },
        end(data) {
          this.body = data;
        },
      };
      const t0 = Date.now();
      await handler(req, res);
      assert.ok(Date.now() - t0 < 10_000);
      assert.deepEqual(events, []);
      assert.ok(res.statusCode === 401 || res.statusCode === 503);
    } finally {
      globalThis.__zwServerlessHealthTestHook = original;
    }
  });
});
