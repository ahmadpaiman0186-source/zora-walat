/**
 * OTP email transport snapshot + sendOTP path (no real SMTP; env isolation).
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

describe('getOtpEmailReadinessSnapshot', () => {
  const keys = [
    'OTP_TRANSPORT',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];
  /** @type {Record<string, string | undefined>} */
  let saved = {};

  beforeEach(() => {
    saved = {};
    for (const k of keys) {
      saved[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('resolves console mode and marks SMTP as not applicable', async () => {
    process.env.OTP_TRANSPORT = 'console';
    delete process.env.EMAIL_PASS;
    const { getOtpEmailReadinessSnapshot } = await import(
      '../services/emailService.js'
    );
    const s = getOtpEmailReadinessSnapshot();
    assert.equal(s.otpTransport, 'console');
    assert.equal(s.smtpConfigPresent, true);
    assert.deepEqual(s.smtpMissingKeys, []);
    assert.equal(s.smtpPortValid, true);
  });

  it('email mode with missing SMTP keys lists missing and smtp_config_present false', async () => {
    process.env.OTP_TRANSPORT = 'email';
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_PORT;
    const { getOtpEmailReadinessSnapshot } = await import(
      '../services/emailService.js'
    );
    const s = getOtpEmailReadinessSnapshot();
    assert.equal(s.otpTransport, 'email');
    assert.equal(s.smtpConfigPresent, false);
    assert.ok(s.smtpMissingKeys.includes('EMAIL_HOST'));
    assert.ok(s.smtpMissingKeys.includes('EMAIL_USER'));
    assert.ok(s.smtpMissingKeys.includes('EMAIL_PASS'));
  });

  it('rejects invalid EMAIL_PORT for smtp_port_valid', async () => {
    process.env.OTP_TRANSPORT = 'email';
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_USER = 'u@example.com';
    process.env.EMAIL_PASS = 'x';
    process.env.EMAIL_PORT = 'not-a-port';
    const { getOtpEmailReadinessSnapshot } = await import(
      '../services/emailService.js'
    );
    const s = getOtpEmailReadinessSnapshot();
    assert.equal(s.smtpPortValid, false);
    assert.ok(s.smtpMissingKeys.includes('EMAIL_PORT'));
  });
});

describe('sendOTP transport paths', () => {
  const keys = [
    'OTP_TRANSPORT',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];
  /** @type {Record<string, string | undefined>} */
  let saved = {};

  beforeEach(() => {
    saved = {};
    for (const k of keys) {
      saved[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('throws otp_delivery_misconfigured when email mode and SMTP structurally incomplete', async () => {
    process.env.OTP_TRANSPORT = 'email';
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    const { sendOTP, EmailServiceError, resetEmailTransportForTests } =
      await import('../services/emailService.js');
    resetEmailTransportForTests();
    await assert.rejects(
      () => sendOTP('a@b.com', '123456'),
      (err) =>
        err instanceof EmailServiceError &&
        err.code === 'otp_delivery_misconfigured',
    );
  });

  it('console mode does not require SMTP and logs without throwing', async () => {
    process.env.OTP_TRANSPORT = 'console';
    delete process.env.EMAIL_PASS;
    const origLog = console.log;
    const lines = [];
    console.log = (...args) => {
      lines.push(args.join(' '));
    };
    try {
      const { sendOTP, resetEmailTransportForTests } = await import(
        '../services/emailService.js'
      );
      resetEmailTransportForTests();
      await sendOTP('someone@example.com', '999888');
      const otpLine = lines.find((l) => l.includes('OTP_TRANSPORT=console'));
      assert.ok(otpLine, 'expected console OTP log');
      assert.ok(!otpLine.includes('EMAIL_PASS'));
    } finally {
      console.log = origLog;
    }
  });

  it('email mode with full env enters SMTP path (verify may fail; not misconfigured)', async () => {
    process.env.OTP_TRANSPORT = 'email';
    process.env.EMAIL_HOST = 'smtp.invalid.localtest';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'u@test.invalid';
    process.env.EMAIL_PASS = 'dummy-pass-for-test';
    const { sendOTP, EmailServiceError, resetEmailTransportForTests } =
      await import('../services/emailService.js');
    resetEmailTransportForTests();
    await assert.rejects(
      () => sendOTP('dest@test.invalid', '123456'),
      (err) => {
        if (!(err instanceof EmailServiceError)) return false;
        assert.notEqual(
          err.code,
          'otp_delivery_misconfigured',
          'must pass structural gate and attempt SMTP',
        );
        return true;
      },
    );
  });
});
