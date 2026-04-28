/**
 * Ensures main-balance ledger invariant scope cannot false-positive on promotional/referral rows.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  USER_WALLET_LEDGER_REASON_REFERRAL_INVITER_PROMOTIONAL,
  USER_WALLET_LEDGER_REASON_WALLET_TOPUP,
  USER_WALLET_MAIN_BALANCE_LEDGER_REASONS,
} from '../src/constants/walletLedgerReasons.js';

describe('wallet ledger invariant scope (constants)', () => {
  it('excludes promotional referral credit from main-balance ledger reasons', () => {
    assert.ok(
      !USER_WALLET_MAIN_BALANCE_LEDGER_REASONS.includes(
        USER_WALLET_LEDGER_REASON_REFERRAL_INVITER_PROMOTIONAL,
      ),
    );
  });

  it('includes idempotent wallet top-up reason', () => {
    assert.ok(
      USER_WALLET_MAIN_BALANCE_LEDGER_REASONS.includes(
        USER_WALLET_LEDGER_REASON_WALLET_TOPUP,
      ),
    );
  });
});
