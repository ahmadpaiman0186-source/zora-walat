/**
 * Local-only: run requestEmailOtp + real sendOTP (console transport) without HTTP.
 * Refuses unless NODE_ENV=development and OTP_TRANSPORT=console.
 */
import '../bootstrap.js';

if (process.env.NODE_ENV !== 'development') {
  console.error(
    '[dev-otp-dry-run] Refused: set NODE_ENV=development (this script is for local dev only).',
  );
  process.exit(2);
}
if (String(process.env.OTP_TRANSPORT ?? '').trim().toLowerCase() !== 'console') {
  console.error(
    '[dev-otp-dry-run] Refused: set OTP_TRANSPORT=console in server/.env.local so the OTP prints here.',
  );
  process.exit(2);
}

const { requestEmailOtp } = await import(
  '../src/services/identity/otpChallengeService.js'
);
const { sendOTP } = await import('../services/emailService.js');

const email = String(process.argv[2] ?? '').trim();
if (!email) {
  console.error('Usage: node scripts/dev-otp-dry-run.mjs <email>');
  process.exit(1);
}

await requestEmailOtp(
  { email },
  { sendOtp: sendOTP, clientIpKey: '127.0.0.1' },
);
process.exit(0);
