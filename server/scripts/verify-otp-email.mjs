#!/usr/bin/env node
/**
 * Non-secret OTP + SMTP readiness check (no OTP values, no passwords printed).
 * Usage: npm --prefix server run verify:otp-email
 *
 * Set OTP_VERIFY_SMTP=1 to attempt a short SMTP verify() (network) after transporter construct.
 */
import '../bootstrap.js';
import {
  getEmailConfig,
  getOtpEmailReadinessSnapshot,
  probeNodemailerTransportConstructs,
} from '../services/emailService.js';
import nodemailer from 'nodemailer';

const s = getOtpEmailReadinessSnapshot();
const construct = probeNodemailerTransportConstructs();

let smtpVerify = 'skipped';
if (
  String(process.env.OTP_VERIFY_SMTP ?? '')
    .trim()
    .toLowerCase() === '1' &&
  s.otpTransport === 'email' &&
  construct.ok &&
  !construct.skipped
) {
  try {
    const cfg = getEmailConfig();
    const t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: false,
      requireTLS: true,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
        servername: cfg.host,
      },
    });
    await Promise.race([
      t.verify(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('verify_timeout')), 8_000),
      ),
    ]);
    smtpVerify = 'ok';
  } catch {
    smtpVerify = 'failed';
  }
}

const structuralPass =
  s.otpTransport === 'console' ||
  (s.otpTransport === 'email' &&
    s.smtpConfigPresent &&
    s.smtpPortValid &&
    construct.ok);

console.log(
  JSON.stringify(
    {
      otp_transport: s.otpTransport,
      smtp_config_present: s.smtpConfigPresent,
      smtp_missing_keys: s.smtpMissingKeys,
      smtp_port_valid: s.smtpPortValid,
      nodemailer_construct_ok: construct.skipped ? 'skipped' : construct.ok,
      smtp_verify: smtpVerify,
      result: structuralPass ? 'PASS' : 'FAIL',
    },
    null,
    2,
  ),
);

process.exit(structuralPass ? 0 : 1);
