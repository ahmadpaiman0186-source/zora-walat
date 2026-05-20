/**
 * Staging route diagnostics — classify 404 HTML vs API errors.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyStagingHttpResponse,
  responseLooksLikeNextHtml,
  ROUTE_DIAGNOSIS,
} from '../tools/stagingOperatorRouteDiagnostics.mjs';

describe('responseLooksLikeNextHtml', () => {
  it('detects Next 404 HTML', () => {
    assert.equal(
      responseLooksLikeNextHtml('text/html', '<!DOCTYPE html><h1 class="next-error-h1">'),
      true,
    );
  });

  it('returns false for JSON API body', () => {
    assert.equal(
      responseLooksLikeNextHtml('application/json', '{"code":"auth_required"}'),
      false,
    );
  });
});

describe('classifyStagingHttpResponse', () => {
  it('classifies 404 HTML as wrong deployment', () => {
    const r = classifyStagingHttpResponse({
      status: 404,
      contentType: 'text/html',
      text: '<!DOCTYPE html>next-error',
      path: '/api/auth/login',
      method: 'POST',
    });
    assert.equal(r.diagnosis, ROUTE_DIAGNOSIS.ROUTE_MISSING_OR_WRONG_DEPLOYMENT);
    assert.equal(r.apiSurfaceLikely, 'nextjs_frontend');
  });

  it('classifies login 401 as invalid_credentials not deployment', () => {
    const r = classifyStagingHttpResponse({
      status: 401,
      contentType: 'application/json',
      json: { code: 'auth_invalid_credentials' },
      path: '/api/auth/login',
      method: 'POST',
    });
    assert.equal(r.diagnosis, ROUTE_DIAGNOSIS.INVALID_CREDENTIALS);
  });

  it('classifies login 400 JSON as validation (API alive)', () => {
    const r = classifyStagingHttpResponse({
      status: 400,
      contentType: 'application/json',
      json: { code: 'validation_error' },
      path: '/api/auth/login',
      method: 'POST',
    });
    assert.equal(r.diagnosis, ROUTE_DIAGNOSIS.VALIDATION_ERROR);
    assert.equal(r.apiSurfaceLikely, 'api_serverless');
  });
});
