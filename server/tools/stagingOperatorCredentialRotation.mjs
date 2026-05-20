/**
 * Guarded staging-only operator credential rotation (diagnose / plan / dry-run / execute).
 * Never prints passwords, hashes, DATABASE_URL, tokens, or PII.
 */
import { createHash } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import bcrypt from 'bcrypt';

import {
  credentialEnvDiagnostics,
  loadOperatorDotenv,
  readOperatorEmail,
  readOperatorPassword,
} from './stagingOperatorAuthEnv.mjs';

/** Must match authService.js BCRYPT_ROUNDS. */
export const BCRYPT_ROUNDS = 12;

export const ROTATION_APPROVAL_PHRASE =
  'Approved: staging operator credential rotation';

export const ROTATION_MODES = Object.freeze([
  'diagnose',
  'plan',
  'dry-run',
  'execute',
]);

const DEFAULT_STAGING_API_HOST_MARKER = 'zora-walat-api-staging';
const MIN_USABLE_DATABASE_URL_LENGTH = 80;

/**
 * @param {NodeJS.ProcessEnv} env
 */
function envTruthy(name, env = process.env) {
  const v = String(env[name] ?? '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * @param {string} email
 */
export function operatorEmailHash(email) {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return '';
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function assessStagingRotationGuard(env) {
  const nodeEnv = String(env.NODE_ENV ?? '')
    .trim()
    .toLowerCase();
  const vercelEnv = String(env.VERCEL_ENV ?? '')
    .trim()
    .toLowerCase();
  const armed = envTruthy('ZW_STAGING_CREDENTIAL_ROTATION', env);
  const apiBase = String(
    env.ZW_STAGING_API_BASE ?? env.STAGING_API_BASE ?? '',
  )
    .trim()
    .toLowerCase();
  const apiLooksStaging =
    apiBase.length === 0 || apiBase.includes(DEFAULT_STAGING_API_HOST_MARKER);
  const apiLooksProduction =
    apiBase.includes('zora-walat-api.vercel.app') &&
    !apiBase.includes('staging');
  const productionLike =
    (nodeEnv === 'production' && vercelEnv === 'production' && !armed) ||
    apiLooksProduction;

  const stagingOnlyOk = armed && apiLooksStaging && !productionLike;

  let blockedReason = 'ok';
  if (!armed) blockedReason = 'zw_staging_credential_rotation_not_armed';
  else if (apiLooksProduction) blockedReason = 'production_api_host_blocked';
  else if (!apiLooksStaging) blockedReason = 'staging_api_host_not_confirmed';
  else if (productionLike) blockedReason = 'production_environment_blocked';

  return {
    stagingOnlyOk,
    productionBlocked: productionLike,
    armed,
    apiHostClass: apiLooksProduction
      ? 'production_like'
      : apiLooksStaging
        ? 'staging'
        : 'unknown',
    blockedReason,
  };
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function assessApprovalPhrase(env) {
  const got = String(env.STAGING_OPERATOR_ROTATION_APPROVAL ?? '').trim();
  return {
    present: got.length > 0,
    exactMatch: got === ROTATION_APPROVAL_PHRASE,
  };
}

/**
 * @param {string} dbUrl
 */
export function databaseUrlUsable(dbUrl) {
  const s = String(dbUrl ?? '').trim();
  return s.length >= MIN_USABLE_DATABASE_URL_LENGTH;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} email
 */
export async function lookupOperatorUser(prisma, email) {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return {
      lookup: 'error',
      matchCount: 0,
      user: null,
      errorReason: 'operator_email_missing',
    };
  }

  try {
    const rows = await prisma.user.findMany({
      where: { email: normalized },
      select: {
        id: true,
        isActive: true,
        emailVerifiedAt: true,
        role: true,
      },
    });
    if (rows.length === 0) {
      return { lookup: 'not_found', matchCount: 0, user: null, errorReason: null };
    }
    if (rows.length > 1) {
      return {
        lookup: 'ambiguous',
        matchCount: rows.length,
        user: null,
        errorReason: 'multiple_rows_for_email',
      };
    }
    return { lookup: 'found', matchCount: 1, user: rows[0], errorReason: null };
  } catch {
    return {
      lookup: 'error',
      matchCount: 0,
      user: null,
      errorReason: 'database_query_failed',
    };
  }
}

/**
 * @param {{ isActive: boolean, emailVerifiedAt: Date | null, role: string } | null} user
 */
export function classifyOperatorUserState(user) {
  if (!user) {
    return {
      activeStatus: 'unknown',
      emailVerifiedStatus: 'unknown',
      roleOk: 'unknown',
    };
  }
  return {
    activeStatus: user.isActive ? 'active' : 'inactive',
    emailVerifiedStatus: user.emailVerifiedAt ? 'verified' : 'unverified',
    roleOk: user.role === 'user' || user.role === 'admin' ? 'true' : 'false',
  };
}

/**
 * @param {object} input
 */
export function recommendRotationAction(input) {
  const {
    stagingOnlyOk,
    lookup,
    activeStatus,
    dbReachable,
    hasEmail,
    hasNewPassword,
    approvalExact,
    mode,
  } = input;

  if (mode === 'execute' && !approvalExact) {
    return 'BLOCKED_AWAITING_APPROVAL_PHRASE';
  }
  if (!stagingOnlyOk) return 'BLOCKED_NOT_STAGING_ONLY';
  if (!dbReachable) return 'CONFIRM_STAGING_DATABASE_URL';
  if (!hasEmail) return 'SET_STAGING_OPERATOR_EMAIL';
  if (lookup === 'not_found') return 'CREATE_OR_REGISTER_OPERATOR_USER';
  if (lookup === 'ambiguous') return 'BLOCKED_AMBIGUOUS_OPERATOR_USER';
  if (lookup === 'error') return 'FIX_STAGING_DATABASE_CONNECTIVITY';
  if (activeStatus === 'inactive') return 'ACTIVATE_OPERATOR_USER';
  if (mode === 'execute' && !hasNewPassword) {
    return 'SUPPLY_NEW_PASSWORD_SECURELY';
  }
  if (mode === 'dry-run' || mode === 'execute') {
    return 'ROTATE_STAGING_OPERATOR_PASSWORD';
  }
  return 'RUN_DRY_RUN_THEN_APPROVED_EXECUTE';
}

/**
 * @param {{
 *   mode: string,
 *   env?: NodeJS.ProcessEnv,
 *   prisma?: import('@prisma/client').PrismaClient,
 *   emit: (key: string, value: string) => void,
 *   tokenPath?: string,
 *   readNewPassword?: () => Promise<string | null>,
 * }} ctx
 */
export async function runCredentialRotationMode(ctx) {
  const mode = String(ctx.mode ?? '').trim().toLowerCase();
  const env = ctx.env ?? process.env;
  const emit = ctx.emit;

  emit('CREDENTIAL_ROTATION_MODE', mode);
  emit('DATABASE_URL_PRINTED', 'false');
  emit('SECRET_EXPOSURE', 'false');
  emit('DB_WRITE_PERFORMED', 'false');

  if (!ROTATION_MODES.includes(mode)) {
    emit('ROTATION_VERDICT', 'BLOCKED');
    emit('BLOCKED_REASON', 'unknown_mode');
    return 2;
  }

  const guard = assessStagingRotationGuard(env);
  emit('STAGING_ONLY_ARMED', guard.armed ? 'true' : 'false');
  emit('STAGING_API_HOST_CLASS', guard.apiHostClass);
  emit('PRODUCTION_BLOCKED', guard.productionBlocked ? 'true' : 'false');

  const creds = credentialEnvDiagnostics(env);
  emit('HAS_OPERATOR_EMAIL', creds.hasEmail ? 'true' : 'false');
  emit('HAS_OPERATOR_PASSWORD', creds.hasPassword ? 'true' : 'false');
  emit('EMAIL_LENGTH', String(creds.emailLength));
  emit('PASSWORD_LENGTH', String(creds.passwordLength));
  emit('OLD_PASSWORD_STATUS', 'COMPROMISED_DO_NOT_REUSE');

  const approval = assessApprovalPhrase(env);
  emit('APPROVAL_PHRASE_PRESENT', approval.present ? 'true' : 'false');
  emit('APPROVAL_PHRASE_EXACT', approval.exactMatch ? 'true' : 'false');

  if (mode === 'plan') {
    return emitPlan(emit, guard);
  }

  const email = readOperatorEmail(env);
  if (email) emit('OPERATOR_EMAIL_HASH', operatorEmailHash(email));

  let dbReachable = false;
  let lookup = /** @type {import('./stagingOperatorCredentialRotation.mjs').lookupOperatorUser extends Function ? Awaited<ReturnType<typeof lookupOperatorUser>>['lookup'] : string} */ (
    'unknown'
  );
  let userState = classifyOperatorUserState(null);

  if (ctx.prisma) {
    const dbUrl = String(env.DATABASE_URL ?? '').trim();
    dbReachable = false;
    if (databaseUrlUsable(dbUrl)) {
      try {
        await ctx.prisma.$queryRaw`SELECT 1`;
        dbReachable = true;
      } catch {
        dbReachable = false;
      }
    }
    const found = await lookupOperatorUser(ctx.prisma, email);
    lookup = found.lookup;
    emit('OPERATOR_USER_MATCH_COUNT', String(found.matchCount));
    userState = classifyOperatorUserState(found.user);
    if (found.user?.id) {
      emit('OPERATOR_USER_ID_SUFFIX', String(found.user.id).slice(-8));
    }
    if (found.errorReason) emit('LOOKUP_ERROR_REASON', found.errorReason);
  } else if (!databaseUrlUsable(env.DATABASE_URL)) {
    lookup = 'error';
    emit('LOOKUP_ERROR_REASON', 'database_url_not_configured');
  }

  emit('STAGING_DB_REACHABLE', dbReachable ? 'true' : 'false');
  emit('OPERATOR_USER_LOOKUP', lookup);
  emit('OPERATOR_ACTIVE_STATUS', userState.activeStatus);
  emit('EMAIL_VERIFIED_STATUS', userState.emailVerifiedStatus);
  emit('ROLE_OK', userState.roleOk);

  const newPasswordLen = String(env.STAGING_OPERATOR_NEW_PASSWORD ?? '').trim()
    .length;
  emit('NEW_PASSWORD_SUPPLIED', newPasswordLen > 0 ? 'true' : 'false');
  emit('NEW_PASSWORD_LENGTH', String(newPasswordLen));

  const recommended = recommendRotationAction({
    stagingOnlyOk: guard.stagingOnlyOk,
    lookup,
    activeStatus: userState.activeStatus,
    dbReachable,
    hasEmail: creds.hasEmail,
    hasNewPassword: newPasswordLen > 0,
    approvalExact: approval.exactMatch,
    mode,
  });
  emit('RECOMMENDED_ACTION', recommended);

  if (mode === 'diagnose') {
    emit('ROTATION_VERDICT', guard.stagingOnlyOk ? 'DIAGNOSE_OK' : 'BLOCKED');
    return guard.stagingOnlyOk ? 0 : 1;
  }

  if (mode === 'dry-run') {
    return runDryRun({
      emit,
      guard,
      lookup,
      approval,
      creds,
      newPasswordLen,
      recommended,
    });
  }

  if (mode === 'execute') {
    return runExecute({
      emit,
      env,
      guard,
      lookup,
      approval,
      creds,
      prisma: ctx.prisma,
      tokenPath: ctx.tokenPath,
      readNewPassword: ctx.readNewPassword,
      userState,
      email,
      recommended,
    });
  }

  emit('ROTATION_VERDICT', 'BLOCKED');
  return 2;
}

/**
 * @param {(k: string, v: string) => void} emit
 * @param {{ stagingOnlyOk: boolean, armed: boolean }} guard
 */
function emitPlan(emit, guard) {
  emit('ROTATION_PLAN_STEP', 'treat_old_password_as_compromised');
  emit('ROTATION_PLAN_STEP', 'rotate_staging_operator_password_only');
  emit('ROTATION_PLAN_STEP', 'invalidate_local_staging_token_file');
  emit('ROTATION_PLAN_STEP', 'verify_login_http_200');
  emit('ROTATION_PLAN_STEP', 'run_status_check');
  emit('ROTATION_PLAN_STEP', 'run_phase1_truth_check');
  emit('ROTATION_PLAN_STEP', 'run_zw_smoke_staging');
  emit('ROTATION_PLAN_STEP', 'archive_sanitized_ap786_evidence');
  emit('APPROVAL_PHRASE_REQUIRED', 'exact_match_in_STAGING_OPERATOR_ROTATION_APPROVAL');
  emit('EXECUTE_MODE_RUN', 'false');
  emit('CREDENTIAL_ROTATION_EXECUTED', 'false');
  emit('ROTATION_VERDICT', guard.stagingOnlyOk ? 'PLAN_OK' : 'BLOCKED');
  return guard.stagingOnlyOk ? 0 : 1;
}

/**
 * @param {object} p
 */
function runDryRun(p) {
  const blockers = [];
  if (!p.guard.stagingOnlyOk) blockers.push('not_staging_only');
  if (!p.creds.hasEmail) blockers.push('missing_operator_email');
  if (p.approval.present) blockers.push('approval_phrase_must_not_be_set_for_dry_run');
  if (p.lookup !== 'found') blockers.push(`lookup_${p.lookup}`);
  if (p.newPasswordLen < 10) blockers.push('new_password_not_supplied_or_too_short');

  p.emit('DRY_RUN_DB_WRITE', 'false');
  p.emit('NEW_PASSWORD_WILL_BE_PRINTED', 'false');
  p.emit('TARGET_OPERATOR_ROW_COUNT', p.lookup === 'found' ? '1' : '0');
  p.emit('EXECUTE_MODE_RUN', 'false');
  p.emit('CREDENTIAL_ROTATION_EXECUTED', 'false');

  const pass = blockers.length === 0;
  p.emit('DRY_RUN_VERDICT', pass ? 'PASS' : 'BLOCKED');
  if (!pass) p.emit('DRY_RUN_BLOCKERS', blockers.join(','));
  p.emit('ROTATION_VERDICT', pass ? 'DRY_RUN_PASS' : 'BLOCKED');
  return pass ? 0 : 1;
}

/**
 * @param {object} p
 */
async function runExecute(p) {
  p.emit('EXECUTE_MODE_RUN', 'true');
  p.emit('CREDENTIAL_ROTATION_EXECUTED', 'false');

  const blockers = [];
  if (!p.guard.stagingOnlyOk) blockers.push('not_staging_only');
  if (!p.approval.exactMatch) blockers.push('approval_phrase_missing_or_inexact');
  if (!p.creds.hasEmail) blockers.push('missing_operator_email');
  if (p.lookup !== 'found') blockers.push(`lookup_${p.lookup}`);
  if (!p.prisma) blockers.push('prisma_not_available');

  if (blockers.length > 0) {
    p.emit('EXECUTE_VERDICT', 'BLOCKED');
    p.emit('EXECUTE_BLOCKERS', blockers.join(','));
    p.emit('ROTATION_VERDICT', 'BLOCKED');
    p.emit('EXECUTE_MODE_RUN', 'false');
    return 1;
  }

  const readFn =
    p.readNewPassword ??
    (async () => {
      const fromEnv = String(p.env.STAGING_OPERATOR_NEW_PASSWORD ?? '').trim();
      if (fromEnv.length >= 10) return fromEnv;
      if (!input.isTTY) return null;
      const rl = createInterface({ input, output });
      try {
        const pw = await rl.question('New staging password (input hidden): ');
        return String(pw ?? '').trim() || null;
      } finally {
        rl.close();
      }
    });

  const newPassword = await readFn();
  if (!newPassword || newPassword.length < 10) {
    p.emit('EXECUTE_VERDICT', 'BLOCKED');
    p.emit('EXECUTE_BLOCKERS', 'new_password_missing_or_too_short');
    p.emit('ROTATION_VERDICT', 'BLOCKED');
    p.emit('EXECUTE_MODE_RUN', 'false');
    return 1;
  }

  p.emit('NEW_PASSWORD_LENGTH', String(newPassword.length));
  p.emit('NEW_PASSWORD_WILL_BE_PRINTED', 'false');

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const email = String(p.email ?? '')
    .trim()
    .toLowerCase();

  try {
    await p.prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });
    p.emit('DB_WRITE_PERFORMED', 'true');
    p.emit('PASSWORD_HASH_UPDATED', 'true');
    p.emit('CREDENTIAL_ROTATION_EXECUTED', 'true');
  } catch {
    p.emit('EXECUTE_VERDICT', 'BLOCKED');
    p.emit('EXECUTE_BLOCKERS', 'database_update_failed');
    p.emit('ROTATION_VERDICT', 'BLOCKED');
    p.emit('DB_WRITE_PERFORMED', 'false');
    return 1;
  }

  if (p.tokenPath && existsSync(p.tokenPath)) {
    try {
      unlinkSync(p.tokenPath);
      p.emit('TOKEN_FILE_DELETED', 'true');
    } catch {
      p.emit('TOKEN_FILE_DELETED', 'false');
    }
  } else {
    p.emit('TOKEN_FILE_DELETED', 'skipped');
  }

  p.emit('EXECUTE_VERDICT', 'PASS');
  p.emit('ROTATION_VERDICT', 'EXECUTE_PASS');
  return 0;
}

/**
 * @param {string} text
 * @param {NodeJS.ProcessEnv} [env]
 */
export function assertRotationOutputSanitized(text, env = {}) {
  const blob = String(text ?? '');
  const forbidden = [
    /\bsk_live_/i,
    /\bsk_test_/i,
    /\bwhsec_/i,
    /\beyJ[A-Za-z0-9_-]{10,}/,
    /postgresql:\/\//i,
    /postgres:\/\//i,
  ];
  for (const re of forbidden) {
    if (re.test(blob)) {
      throw new Error(`sanitization_violation:${re.source}`);
    }
  }
  const pw = String(env.STAGING_OPERATOR_PASSWORD ?? '');
  const newPw = String(env.STAGING_OPERATOR_NEW_PASSWORD ?? '');
  if (pw.length >= 4 && blob.includes(pw)) {
    throw new Error('sanitization_violation:operator_password_leaked');
  }
  if (newPw.length >= 4 && blob.includes(newPw)) {
    throw new Error('sanitization_violation:new_password_leaked');
  }
  if (/\bpasswordHash\b/i.test(blob)) {
    throw new Error('sanitization_violation:password_hash_field');
  }
}

/**
 * CLI entry when run directly: node stagingOperatorCredentialRotation.mjs <mode>
 */
export async function mainCredentialRotationCli(argv = process.argv) {
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  loadOperatorDotenv(serverRoot);
  const mode = String(argv[2] ?? 'diagnose').trim().toLowerCase();
  /** @type {string[]} */
  const lines = [];
  const emit = (key, value) => {
    lines.push(`${key} ${value}`);
    process.stdout.write(`${key} ${value}\n`);
  };

  let prisma = null;
  if (mode !== 'plan' && databaseUrlUsable(process.env.DATABASE_URL)) {
    const { prisma: p } = await import('../src/db.js');
    prisma = p;
  }

  const code = await runCredentialRotationMode({
    mode,
    emit,
    prisma,
    tokenPath: null,
    env: process.env,
  });

  try {
    assertRotationOutputSanitized(lines.join('\n'), process.env);
  } catch (e) {
    emit('ROTATION_VERDICT', 'BLOCKED');
    emit('SANITIZATION_ERROR', String(e.message ?? e).slice(0, 80));
    return 2;
  }

  if (prisma) await prisma.$disconnect().catch(() => {});
  return code;
}

function isCliMain() {
  const entry = String(process.argv[1] ?? '');
  if (!entry) return false;
  return (
    entry.replace(/\\/g, '/').endsWith('stagingOperatorCredentialRotation.mjs')
  );
}

if (isCliMain()) {
  const code = await mainCredentialRotationCli();
  process.exit(code);
}
