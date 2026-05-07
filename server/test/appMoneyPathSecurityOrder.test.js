import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * L17: Critical middleware order for money-path security (webhook raw body + JSON API).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = join(__dirname, '../src/app.js');

describe('app.js money-path security ordering (L17)', () => {
  it('mounts Stripe webhook with raw body before global express.json()', () => {
    const src = readFileSync(appSrc, 'utf8');
    const mount = src.indexOf("'/webhooks/stripe'");
    const raw = src.indexOf('express.raw({ type:');
    const json = src.indexOf("express.json({ limit: '32kb'");
    assert.ok(mount >= 0, 'webhooks/stripe mount present');
    assert.ok(raw >= 0, 'express.raw for webhook present');
    assert.ok(json >= 0, 'express.json global parser present');
    assert.ok(mount < raw && raw < json, 'order: webhook raw mount before JSON parser');
  });

  it('applies restricted-region middleware after JSON parse (not on raw webhook mount)', () => {
    const src = readFileSync(appSrc, 'utf8');
    const json = src.indexOf("express.json({ limit: '32kb'");
    const regionUse = src.indexOf('app.use(blockRestrictedCountries)');
    assert.ok(json >= 0 && regionUse >= 0 && json < regionUse);
  });
});
