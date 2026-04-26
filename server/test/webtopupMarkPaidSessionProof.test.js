import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertWebTopupMarkPaidSessionProof } from '../src/services/topupOrder/topupOrderService.js';

describe('assertWebTopupMarkPaidSessionProof', () => {
  const row = {
    sessionKey: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user_bound_1',
  };

  it('accepts timing-safe session match', () => {
    assert.equal(
      assertWebTopupMarkPaidSessionProof(row, '550e8400-e29b-41d4-a716-446655440000', null),
      true,
    );
  });

  it('rejects wrong session even if JWT matches another user', () => {
    assert.equal(
      assertWebTopupMarkPaidSessionProof(
        row,
        '650e8400-e29b-41d4-a716-446655440001',
        'user_bound_1',
      ),
      false,
    );
  });

  it('allows JWT-only path when userId matches', () => {
    assert.equal(assertWebTopupMarkPaidSessionProof(row, null, 'user_bound_1'), true);
    assert.equal(assertWebTopupMarkPaidSessionProof(row, undefined, 'user_bound_1'), true);
  });

  it('rejects JWT-only when order is anonymous', () => {
    assert.equal(
      assertWebTopupMarkPaidSessionProof({ ...row, userId: null }, null, 'user_bound_1'),
      false,
    );
  });
});
