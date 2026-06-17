/** Six audit scope tables from L-85G (privilege metadata only — no row reads). */
export const DB_READONLY_PROOF_SCOPED_TABLES = Object.freeze([
  'PaymentCheckout',
  'StripeWebhookEvent',
  'AuditLog',
  'FulfillmentAttempt',
  'CanonicalTransaction',
  'LedgerJournalEntry',
]);

/** Expected read-only role (L-85G-proven; boolean comparison only in responses). */
export const DB_READONLY_PROOF_EXPECTED_ROLE = 'zora_walat_readonly_audit';

/** Expected database name (L-85G-proven; boolean comparison only in responses). */
export const DB_READONLY_PROOF_EXPECTED_DATABASE = 'neondb';

export const DB_READONLY_PROOF_VERDICTS = Object.freeze(['PASS', 'BLOCKED', 'FAIL']);

export const DB_READONLY_PROOF_BLOCKED_REASONS = Object.freeze([
  'token_missing',
  'token_invalid',
  'readonly_url_missing',
]);

export const DB_READONLY_PROOF_FAIL_REASONS = Object.freeze([
  'role_mismatch',
  'database_mismatch',
  'superuser_true',
  'write_privilege_present',
  'select_missing',
  'db_connect_failed',
  'check_timeout',
  'scoped_tables_incomplete',
]);

/** @returns {{ no_rows_exported: true, secret_disclosure: false, owner_database_url_fallback_used: false }} */
export function dbReadonlyProofInvariants() {
  return {
    no_rows_exported: true,
    secret_disclosure: false,
    owner_database_url_fallback_used: false,
  };
}

/** @returns {Record<string, unknown>} */
export function dbReadonlyProofFalseFlags() {
  return {
    readonly_role_expected: false,
    database_expected: false,
    role_superuser_false: false,
    role_createdb_false: false,
    role_createrole_false: false,
    scoped_tables_checked_count: 0,
    select_allowed_all_scoped_tables: false,
    write_denied_all_scoped_tables: false,
  };
}

/**
 * @param {string} blockedReason
 * @param {number} httpStatus
 * @returns {{ httpStatus: number, body: Record<string, unknown> }}
 */
export function buildDbReadonlyProofBlocked(blockedReason, httpStatus = 503) {
  return {
    httpStatus,
    body: {
      ...dbReadonlyProofFalseFlags(),
      ...dbReadonlyProofInvariants(),
      verdict: 'BLOCKED',
      blocked_reason: blockedReason,
      checked_at: new Date().toISOString(),
    },
  };
}

/**
 * @param {string} failReason
 * @param {Partial<Record<string, unknown>>} [flags]
 * @returns {{ httpStatus: number, body: Record<string, unknown> }}
 */
export function buildDbReadonlyProofFail(failReason, flags = {}) {
  return {
    httpStatus: 503,
    body: {
      ...dbReadonlyProofFalseFlags(),
      ...flags,
      ...dbReadonlyProofInvariants(),
      verdict: 'FAIL',
      fail_reason: failReason,
      checked_at: new Date().toISOString(),
    },
  };
}

/**
 * @param {Record<string, unknown>} flags
 * @returns {{ httpStatus: number, body: Record<string, unknown> }}
 */
export function buildDbReadonlyProofPass(flags) {
  return {
    httpStatus: 200,
    body: {
      ...flags,
      ...dbReadonlyProofInvariants(),
      verdict: 'PASS',
      checked_at: new Date().toISOString(),
    },
  };
}

/** Allowed top-level response keys (plus checked_at). */
export const DB_READONLY_PROOF_ALLOWED_RESPONSE_KEYS = Object.freeze([
  'readonly_role_expected',
  'database_expected',
  'role_superuser_false',
  'role_createdb_false',
  'role_createrole_false',
  'scoped_tables_checked_count',
  'select_allowed_all_scoped_tables',
  'write_denied_all_scoped_tables',
  'no_rows_exported',
  'secret_disclosure',
  'owner_database_url_fallback_used',
  'verdict',
  'blocked_reason',
  'fail_reason',
  'checked_at',
]);
