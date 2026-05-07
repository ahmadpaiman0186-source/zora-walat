import { createHash } from 'node:crypto';

import nodemailer from 'nodemailer';
import { env } from '../src/config/env.js';

const DEFAULT_EMAIL_HOST = 'mail.privateemail.com';
const DEFAULT_EMAIL_PORT = 587;
const DEFAULT_EMAIL_SENDER = 'noreply@zorawalat.com';

let transporterPromise = null;
let transporterCacheKey = null;
const TRANSPORT_VERIFY_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 20_000;
const MAX_SEND_RETRIES = 2;
const RETRYABLE_EMAIL_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ESOCKET',
  'ECONNECTION',
  'EENVELOPE',
  'EAUTH',
]);

export class EmailServiceError extends Error {
  constructor(message, { code = 'email_service_error', cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'EmailServiceError';
    this.code = code;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function redactRecipient(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  const [local = '', domain = 'unknown'] = normalized.split('@');
  return {
    recipientDomain: domain || 'unknown',
    recipientLocalHash: local
      ? createHash('sha256').update(local).digest('hex').slice(0, 12)
      : null,
  };
}

function logEmailEvent(level, event, fields = {}) {
  const entry = {
    t: new Date().toISOString(),
    level,
    subsystem: 'email',
    event,
    nodeEnv: env.nodeEnv,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

function withTimeout(promise, ms, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new EmailServiceError(timeoutMessage, {
          code: 'email_transport_unavailable',
        }),
      );
    }, ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function classifyEmailError(error) {
  if (error instanceof EmailServiceError) {
    return error;
  }

  const code = String(error?.code ?? '').trim();
  const responseCode = Number(error?.responseCode ?? 0);

  if (code === 'EENVELOPE' || responseCode === 553 || responseCode === 550) {
    return new EmailServiceError('Recipient address rejected by SMTP provider.', {
      code: 'email_invalid_recipient',
      cause: error,
    });
  }

  if (
    code === 'EAUTH' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    code === 'ECONNECTION' ||
    responseCode >= 400
  ) {
    return new EmailServiceError('SMTP transport is currently unavailable.', {
      code: 'email_transport_unavailable',
      cause: error,
    });
  }

  return new EmailServiceError('Email send failed.', {
    code: 'email_send_failed',
    cause: error,
  });
}

function isRetriableEmailError(error) {
  const classified = classifyEmailError(error);
  if (classified.code === 'email_invalid_recipient') return false;
  const causeCode = String(classified.cause?.code ?? '').trim();
  return (
    classified.code === 'email_transport_unavailable' ||
    RETRYABLE_EMAIL_ERROR_CODES.has(causeCode)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMultilineHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

function parseEmailPort(rawPort) {
  if (!rawPort) return DEFAULT_EMAIL_PORT;
  const parsed = Number.parseInt(String(rawPort).trim(), 10);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }
  throw new EmailServiceError('EMAIL_PORT must be a valid TCP port.', {
    code: 'email_invalid_port',
  });
}

function requireEnv(name, fallback = '') {
  const value = String(process.env[name] ?? fallback).trim();
  if (!value) {
    throw new EmailServiceError(`${name} is required for SMTP email delivery.`, {
      code: 'email_missing_env',
    });
  }
  return value;
}

/** Prefer `primary` env key, then `fallback` (for SMTP_* vs EMAIL_* migration). */
function firstEnvTrim(primary, fallback) {
  const a = String(process.env[primary] ?? '').trim();
  if (a) return a;
  return String(process.env[fallback] ?? '').trim();
}

/**
 * Google SMTP requires a 16‑character App Password (spaces ignored), not the account password.
 * @param {string} host
 * @param {string} passNoSpaces
 */
function assertGmailAppPasswordPolicy(host, passNoSpaces) {
  const h = String(host ?? '').trim().toLowerCase();
  const isGoogleSmtp =
    h === 'smtp.gmail.com' ||
    h === 'smtp.googlemail.com' ||
    h.endsWith('.gmail.com');
  if (!isGoogleSmtp) return;
  if (!passNoSpaces || passNoSpaces.length !== 16) {
    throw new EmailServiceError(
      'Gmail App Password required: Google SMTP expects a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords). Remove spaces in .env. A normal Gmail account password will not work.',
      { code: 'gmail_app_password_required' },
    );
  }
  if (!/^[A-Za-z0-9]{16}$/.test(passNoSpaces)) {
    throw new EmailServiceError(
      'Gmail App Password required: value must be 16 letters/digits after removing spaces (generate a new App Password if needed).',
      { code: 'gmail_app_password_required' },
    );
  }
}

function buildFromHeader(smtpUser) {
  const explicit = firstEnvTrim('SMTP_FROM', 'EMAIL_FROM');
  if (explicit) {
    if (explicit.includes('<') && explicit.includes('>')) return explicit;
    if (explicit.includes('@')) return `Zora-Walat <${explicit}>`;
  }
  const u = String(smtpUser ?? '').trim();
  if (u.includes('@')) return `Zora-Walat <${u}>`;
  return `Zora-Walat <${DEFAULT_EMAIL_SENDER}>`;
}

function extractSenderAddress(fromHeader) {
  const m = String(fromHeader).match(/<([^>]+)>/);
  if (m) return m[1].trim();
  const s = String(fromHeader).trim();
  return s.includes('@') ? s : DEFAULT_EMAIL_SENDER;
}

function normalizeRecipient(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new EmailServiceError('A valid recipient email address is required.', {
      code: 'email_invalid_recipient',
    });
  }
  return normalized;
}

function normalizeNonEmpty(value, fieldName) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new EmailServiceError(`${fieldName} is required.`, {
      code: 'email_invalid_payload',
    });
  }
  return normalized;
}

export function getEmailConfig() {
  const host = firstEnvTrim('SMTP_HOST', 'EMAIL_HOST') || DEFAULT_EMAIL_HOST;
  const portRaw = firstEnvTrim('SMTP_PORT', 'EMAIL_PORT');
  const port = parseEmailPort(portRaw || String(DEFAULT_EMAIL_PORT));
  const user = firstEnvTrim('SMTP_USER', 'EMAIL_USER');
  if (!user) {
    throw new EmailServiceError(
      'SMTP_USER or EMAIL_USER is required for SMTP email delivery.',
      { code: 'email_missing_env' },
    );
  }
  let pass = firstEnvTrim('SMTP_PASS', 'EMAIL_PASS');
  if (!pass) {
    throw new EmailServiceError(
      'SMTP_PASS or EMAIL_PASS is required for SMTP email delivery.',
      { code: 'email_missing_env' },
    );
  }
  pass = pass.replace(/\s+/g, '');
  assertGmailAppPasswordPolicy(host, pass);
  return {
    host,
    port,
    user,
    pass,
  };
}

async function getTransporter() {
  const config = getEmailConfig();
  const cacheKey = `${config.host}:${config.port}:${config.user}`;
  if (transporterPromise && transporterCacheKey === cacheKey) {
    return transporterPromise;
  }

  transporterCacheKey = cacheKey;
  transporterPromise = (async () => {
    const secureRaw = firstEnvTrim('SMTP_SECURE', 'EMAIL_SECURE');
    const secure =
      secureRaw.toLowerCase() === 'true' ||
      secureRaw === '1' ||
      Number(config.port) === 465;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure,
      requireTLS: !secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
        servername: config.host,
      },
    });

    try {
      await withTimeout(
        transporter.verify(),
        TRANSPORT_VERIFY_TIMEOUT_MS,
        'SMTP transporter verification timed out.',
      );
      logEmailEvent('info', 'smtp_verify_ok', {
        smtpHost: config.host,
        smtpPort: config.port,
        smtpSecure: secure,
      });
      return transporter;
    } catch (error) {
      transporterPromise = null;
      transporterCacheKey = null;
      const classified = classifyEmailError(error);
      const responseCode = Number(error?.responseCode ?? 0);
      const responseSnippet = String(error?.response ?? '')
        .trim()
        .replace(/\r?\n/g, ' ')
        .slice(0, 160);
      logEmailEvent('error', 'smtp_verify_failed', {
        smtpHost: config.host,
        smtpPort: config.port,
        errorCode: classified.code,
        smtpCauseCode: String(error?.code ?? '').trim() || null,
        smtpResponseCode: responseCode || null,
        smtpResponseSnippet: responseSnippet || null,
      });
      const isGmailHost = String(config.host).toLowerCase().includes('gmail.com');
      if (isGmailHost && (responseCode === 535 || String(error?.code ?? '') === 'EAUTH')) {
        throw new EmailServiceError(
          'Gmail rejected SMTP credentials (often 535). Use a 16-character App Password for this Google account (not the normal login password), and ensure 2-Step Verification is on.',
          { code: 'gmail_app_password_required', cause: classified },
        );
      }
      throw classified.code === 'email_invalid_recipient'
        ? new EmailServiceError('SMTP transporter verification failed.', {
            code: 'email_transport_unavailable',
            cause: classified,
          })
        : classified;
    }
  })();

  return transporterPromise;
}

async function sendEmail({ to, subject, text, html, template }) {
  const recipient = normalizeRecipient(to);
  const normalizedSubject = normalizeNonEmpty(subject, 'Email subject');
  const normalizedText = normalizeNonEmpty(text, 'Email text body');
  const normalizedHtml = normalizeNonEmpty(html, 'Email HTML body');
  const transporter = await getTransporter();
  const cfg = getEmailConfig();
  const fromHeader = buildFromHeader(cfg.user);
  const senderAddr = extractSenderAddress(fromHeader);
  const recipientFields = redactRecipient(recipient);
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_SEND_RETRIES + 1; attempt += 1) {
    try {
      const info = await withTimeout(
        transporter.sendMail({
          from: fromHeader,
          sender: senderAddr,
          to: recipient,
          subject: normalizedSubject,
          text: normalizedText,
          html: normalizedHtml,
        }),
        SEND_TIMEOUT_MS,
        'SMTP send timed out.',
      );

      logEmailEvent('info', 'email_send_ok', {
        template: template ?? 'generic',
        attempt,
        messageId: info.messageId ?? null,
        acceptedCount: Array.isArray(info.accepted) ? info.accepted.length : 0,
        rejectedCount: Array.isArray(info.rejected) ? info.rejected.length : 0,
        smtpResponsePreview: String(info.response ?? '')
          .trim()
          .slice(0, 160),
        ...recipientFields,
      });

      return {
        messageId: info.messageId ?? null,
        accepted: info.accepted ?? [],
        rejected: info.rejected ?? [],
        response: info.response,
      };
    } catch (error) {
      const classified = classifyEmailError(error);
      lastError = classified;
      logEmailEvent(
        attempt <= MAX_SEND_RETRIES && isRetriableEmailError(classified)
          ? 'warn'
          : 'error',
        'email_send_failed',
        {
          template: template ?? 'generic',
          attempt,
          errorCode: classified.code,
          willRetry:
            attempt <= MAX_SEND_RETRIES && isRetriableEmailError(classified),
          ...recipientFields,
        },
      );

      if (
        attempt > MAX_SEND_RETRIES ||
        !isRetriableEmailError(classified)
      ) {
        throw classified;
      }

      await sleep(250 * 2 ** (attempt - 1));
    }
  }

  throw lastError ?? new EmailServiceError('Email send failed.', {
    code: 'email_send_failed',
  });
}

/**
 * Safe snapshot for startup / verify script — no secrets, no network I/O.
 * @returns {{
 *   otpTransport: 'console' | 'email',
 *   smtpConfigPresent: boolean,
 *   smtpMissingKeys: string[],
 *   smtpPortValid: boolean,
 * }}
 */
export function getOtpEmailReadinessSnapshot() {
  const raw = String(process.env.OTP_TRANSPORT ?? '').trim().toLowerCase();
  const consoleMode = raw === 'console';
  const transportLabel = consoleMode ? 'console' : raw || 'email';
  /** @type {string[]} */
  const missing = [];
  let portParseOk = true;
  if (!consoleMode) {
    if (!firstEnvTrim('SMTP_HOST', 'EMAIL_HOST')) {
      missing.push('SMTP_HOST or EMAIL_HOST');
    }
    if (!firstEnvTrim('SMTP_USER', 'EMAIL_USER')) {
      missing.push('SMTP_USER or EMAIL_USER');
    }
    if (!firstEnvTrim('SMTP_PASS', 'EMAIL_PASS')) {
      missing.push('SMTP_PASS or EMAIL_PASS');
    }
    try {
      parseEmailPort(
        firstEnvTrim('SMTP_PORT', 'EMAIL_PORT') || String(DEFAULT_EMAIL_PORT),
      );
    } catch {
      missing.push('SMTP_PORT or EMAIL_PORT');
      portParseOk = false;
    }
  }
  const smtpConfigPresent =
    consoleMode ||
    (missing.length === 0 &&
      firstEnvTrim('SMTP_PASS', 'EMAIL_PASS').length > 0);
  const smtpPortValid =
    consoleMode ? true : portParseOk && !missing.includes('SMTP_PORT or EMAIL_PORT');
  return {
    otpTransport: transportLabel,
    smtpConfigPresent,
    smtpMissingKeys: [...new Set(missing)],
    smtpPortValid,
  };
}

/**
 * One-line startup line (exact fields for ops / grep). No secrets.
 * Call after `server/bootstrap.js` dotenv and from `startApiRuntime` before `listen`.
 */
export function logOtpEmailTransportStartup() {
  if (process.env.NODE_ENV === 'test') return;
  const s = getOtpEmailReadinessSnapshot();
  console.log(
    `[env] otp_transport=${s.otpTransport} smtp_config_present=${s.smtpConfigPresent} smtp_missing_keys=${JSON.stringify(s.smtpMissingKeys)} smtp_port_valid=${s.smtpPortValid}`,
  );
}

/**
 * Nodemailer transport object can be built (uses real auth from env — no logging).
 * @returns {{ ok: boolean, skipped?: boolean }}
 */
export function probeNodemailerTransportConstructs() {
  const snap = getOtpEmailReadinessSnapshot();
  if (snap.otpTransport === 'console') {
    return { ok: true, skipped: true };
  }
  if (!snap.smtpConfigPresent || !snap.smtpPortValid) {
    return { ok: false, skipped: false };
  }
  try {
    const cfg = getEmailConfig();
    const secureRaw = firstEnvTrim('SMTP_SECURE', 'EMAIL_SECURE');
    const secure =
      secureRaw.toLowerCase() === 'true' ||
      secureRaw === '1' ||
      Number(cfg.port) === 465;
    nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure,
      requireTLS: !secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
        servername: cfg.host,
      },
    });
    return { ok: true, skipped: false };
  } catch {
    return { ok: false, skipped: false };
  }
}

export async function sendOTP(email, code) {
  const normalizedCode = normalizeNonEmpty(code, 'OTP code');
  if (String(process.env.OTP_TRANSPORT ?? '').trim().toLowerCase() === 'console') {
    const r = redactRecipient(email);
    logEmailEvent('info', 'otp_console_transport', {
      template: 'otp',
      ...r,
    });
    console.log(
      `[email] OTP_TRANSPORT=console — code for ${r.recipientLocalHash ? '…' : '?'}@${r.recipientDomain}: ${normalizedCode}`,
    );
    /** Grep-friendly line when NODE_ENV=development — OTP only ever printed for console transport. */
    if (String(process.env.NODE_ENV ?? '').trim() === 'development') {
      console.log(`OTP CODE: ${normalizedCode}`);
    }
    return { messageId: null, accepted: [], rejected: [], response: 'console' };
  }

  const snap = getOtpEmailReadinessSnapshot();
  if (!snap.smtpConfigPresent || !snap.smtpPortValid) {
    throw new EmailServiceError(
      'SMTP configuration is incomplete for email OTP delivery.',
      { code: 'otp_delivery_misconfigured' },
    );
  }

  return sendEmail({
    to: email,
    subject: 'Your Zora-Walat verification code',
    text:
      `Your Zora-Walat verification code is ${normalizedCode}.\n\n` +
      'If you did not request this code, you can ignore this email.',
    html:
      `<p>Your Zora-Walat verification code is <strong>${escapeHtml(normalizedCode)}</strong>.</p>` +
      '<p>If you did not request this code, you can ignore this email.</p>',
    template: 'otp',
  });
}

export async function sendReceipt(email, amount, phone) {
  const normalizedAmount = normalizeNonEmpty(amount, 'Receipt amount');
  const normalizedPhone = normalizeNonEmpty(phone, 'Receipt phone');
  return sendEmail({
    to: email,
    subject: 'Your Zora-Walat receipt',
    text:
      'Thank you for using Zora-Walat.\n\n' +
      `Amount: ${normalizedAmount}\n` +
      `Phone: ${normalizedPhone}\n\n` +
      'If you have any questions, reply to this email.',
    html:
      '<p>Thank you for using Zora-Walat.</p>' +
      `<p><strong>Amount:</strong> ${escapeHtml(normalizedAmount)}<br />` +
      `<strong>Phone:</strong> ${escapeHtml(normalizedPhone)}</p>` +
      '<p>If you have any questions, reply to this email.</p>',
    template: 'receipt',
  });
}

export async function sendSupportReply(email, message) {
  const normalizedMessage = normalizeNonEmpty(message, 'Support reply message');
  return sendEmail({
    to: email,
    subject: 'Zora-Walat support reply',
    text: `Zora-Walat support team replied:\n\n${normalizedMessage}`,
    html:
      '<p>Zora-Walat support team replied:</p>' +
      `<p>${normalizeMultilineHtml(normalizedMessage)}</p>`,
    template: 'support_reply',
  });
}

export function resetEmailTransportForTests() {
  transporterPromise = null;
  transporterCacheKey = null;
}
