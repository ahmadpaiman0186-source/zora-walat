/**
 * Unit tests: public OTP request body contract + console transport (no DB).
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { env } from '../src/config/env.js';
import {
  PUBLIC_OTP_REQUEST_MESSAGE,
  PUBLIC_OTP_REQUEST_HINT,
  buildPublicOtpRequestExpectedBody,
  OTP_DEV_EVENTS,
} from '../src/services/identity/otpChallengeService.js';

describe('OTP public contract & dev event constants', () => {
  it('buildPublicOtpRequestExpectedBody matches generic anti-enumeration shape', () => {
    const b = buildPublicOtpRequestExpectedBody(env.authOtpResendCooldownSec);
    assert.equal(b.message, PUBLIC_OTP_REQUEST_MESSAGE);
    assert.equal(b.hint, PUBLIC_OTP_REQUEST_HINT);
    assert.equal(b.retryAfterSeconds, env.authOtpResendCooldownSec);
  });

  it('OTP_DEV_EVENTS lists required diagnostic keys', () => {
    assert.equal(
      OTP_DEV_EVENTS.USER_MISSING_OR_INACTIVE,
      'user_missing_or_inactive',
    );
    assert.equal(OTP_DEV_EVENTS.RESEND_COOLDOWN_ACTIVE, 'resend_cooldown_active');
    assert.equal(
      OTP_DEV_EVENTS.REQUEST_WINDOW_LIMIT_REACHED,
      'request_window_limit_reached',
    );
    assert.equal(OTP_DEV_EVENTS.OTP_DELIVERY_FAILED, 'otp_delivery_failed');
    assert.equal(OTP_DEV_EVENTS.OTP_ISSUED_CONSOLE, 'otp_issued_console');
  });
});

describe('sendOTP console transport', () => {
  const origLog = console.log;
  let logs = [];

  beforeEach(() => {
    logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.log = origLog;
    delete process.env.OTP_TRANSPORT;
  });

  it('prints OTP to stdout when OTP_TRANSPORT=console (redacted local part)', async () => {
    process.env.OTP_TRANSPORT = 'console';
    const { sendOTP } = await import('../services/emailService.js');
    await sendOTP('someone@example.com', '123456');
    const line = logs.find((l) => l.includes('[email] OTP_TRANSPORT=console'));
    assert.ok(line, 'expected console OTP line');
    assert.ok(line.includes('123456'), 'expected code in line');
    assert.ok(
      !line.includes('someone'),
      'must not print full local-part email in line',
    );
    assert.ok(line.includes('@example.com'), 'domain may appear for operator context');
  });
});
