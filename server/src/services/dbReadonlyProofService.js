import { PrismaClient } from '@prisma/client';

import { env } from '../config/env.js';
import {
  DB_READONLY_PROOF_EXPECTED_DATABASE,
  DB_READONLY_PROOF_EXPECTED_ROLE,
  DB_READONLY_PROOF_SCOPED_TABLES,
  buildDbReadonlyProofBlocked,
  buildDbReadonlyProofFail,
  buildDbReadonlyProofPass,
} from '../lib/dbReadonlyProofContract.js';
import { normalizeDatabaseUrlEnv } from '../lib/normalizeDatabaseUrlEnv.js';
import { opsInfraHealthTokenMatches } from '../middleware/opsInfraHealthGate.js';

/** @typedef {import('@prisma/client').PrismaClient} ReadonlyProofClient */

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function requestPresentsOpsToken(req) {
  const auth = req.headers.authorization;
  const x = req.headers['x-zw-ops-token'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    if (auth.slice(7).trim().length > 0) return true;
  }
  if (typeof x === 'string' && x.trim().length > 0) return true;
  return false;
}

/**
 * @returns {boolean}
 */
function isOpsHealthTokenConfigured() {
  return String(env.opsInfraHealthToken ?? '').trim().length >= 16;
}

/**
 * READ_ONLY_DATABASE_URL only — never DATABASE_URL.
 * @param {() => string | undefined} [getReadonlyUrl]
 * @returns {string}
 */
export function resolveReadonlyDatabaseUrl(getReadonlyUrl) {
  const reader =
    getReadonlyUrl ??
    (() => normalizeDatabaseUrlEnv(process.env.READ_ONLY_DATABASE_URL));
  return String(reader() ?? '').trim();
}

/**
 * @param {string} readonlyUrl
 * @returns {ReadonlyProofClient}
 */
export function createReadonlyProofPrismaClient(readonlyUrl) {
  return new PrismaClient({
    datasources: {
      db: { url: readonlyUrl },
    },
  });
}

/**
 * Metadata-only privilege and identity checks — no business row reads.
 * @param {ReadonlyProofClient} client
 * @returns {Promise<Omit<import('../lib/dbReadonlyProofContract.js').buildDbReadonlyProofPass, never>>}
 */
export async function runReadonlyProofMetadataChecks(client) {
  const [identityRow] = await client.$queryRaw`
    SELECT current_user AS role_name, current_database() AS db_name
  `;
  const [roleRow] = await client.$queryRaw`
    SELECT rolsuper, rolcreatedb, rolcreaterole
    FROM pg_roles
    WHERE rolname = current_user
  `;
  const privilegeRows = await client.$queryRaw`
    SELECT
      c.relname AS table_name,
      has_table_privilege(current_user, c.oid, 'SELECT') AS sel,
      has_table_privilege(current_user, c.oid, 'INSERT') AS ins,
      has_table_privilege(current_user, c.oid, 'UPDATE') AS upd,
      has_table_privilege(current_user, c.oid, 'DELETE') AS del,
      has_table_privilege(current_user, c.oid, 'TRUNCATE') AS trunc
    FROM pg_class c
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'PaymentCheckout',
        'StripeWebhookEvent',
        'AuditLog',
        'FulfillmentAttempt',
        'CanonicalTransaction',
        'LedgerJournalEntry'
      )
  `;

  const roleName = String(identityRow?.role_name ?? '');
  const dbName = String(identityRow?.db_name ?? '');

  const readonlyRoleExpected = roleName === DB_READONLY_PROOF_EXPECTED_ROLE;
  const databaseExpected = dbName === DB_READONLY_PROOF_EXPECTED_DATABASE;

  const roleSuperuserFalse = roleRow?.rolsuper === false;
  const roleCreatedbFalse = roleRow?.rolcreatedb === false;
  const roleCreateroleFalse = roleRow?.rolcreaterole === false;

  const rows = Array.isArray(privilegeRows) ? privilegeRows : [];
  const scopedTablesCheckedCount = rows.length;

  let selectAllowedAll = scopedTablesCheckedCount === DB_READONLY_PROOF_SCOPED_TABLES.length;
  let writeDeniedAll = scopedTablesCheckedCount === DB_READONLY_PROOF_SCOPED_TABLES.length;

  for (const row of rows) {
    if (row?.sel !== true) selectAllowedAll = false;
    if (row?.ins === true || row?.upd === true || row?.del === true || row?.trunc === true) {
      writeDeniedAll = false;
    }
  }

  if (scopedTablesCheckedCount !== DB_READONLY_PROOF_SCOPED_TABLES.length) {
    selectAllowedAll = false;
    writeDeniedAll = false;
  }

  return {
    readonly_role_expected: readonlyRoleExpected,
    database_expected: databaseExpected,
    role_superuser_false: roleSuperuserFalse,
    role_createdb_false: roleCreatedbFalse,
    role_createrole_false: roleCreateroleFalse,
    scoped_tables_checked_count: scopedTablesCheckedCount,
    select_allowed_all_scoped_tables: selectAllowedAll,
    write_denied_all_scoped_tables: writeDeniedAll,
  };
}

/**
 * @param {string} readonlyUrl
 * @param {{
 *   createClient?: (url: string) => ReadonlyProofClient,
 *   runMetadataChecks?: (client: ReadonlyProofClient) => Promise<Record<string, unknown>>,
 * }} [deps]
 */
export async function runReadonlyProofProbe(readonlyUrl, deps = {}) {
  const createClient = deps.createClient ?? createReadonlyProofPrismaClient;
  const runMetadataChecks = deps.runMetadataChecks ?? runReadonlyProofMetadataChecks;
  const client = createClient(readonlyUrl);
  try {
    return await runMetadataChecks(client);
  } finally {
    await client.$disconnect();
  }
}

/**
 * @param {Record<string, unknown>} flags
 * @returns {{ httpStatus: number, body: Record<string, unknown> }}
 */
export function finalizeReadonlyProofVerdict(flags) {
  const requiredBooleans = [
    flags.readonly_role_expected,
    flags.database_expected,
    flags.role_superuser_false,
    flags.role_createdb_false,
    flags.role_createrole_false,
    flags.select_allowed_all_scoped_tables,
    flags.write_denied_all_scoped_tables,
  ];

  if (flags.scoped_tables_checked_count !== DB_READONLY_PROOF_SCOPED_TABLES.length) {
    return buildDbReadonlyProofFail('scoped_tables_incomplete', flags);
  }

  if (!flags.role_superuser_false) {
    return buildDbReadonlyProofFail('superuser_true', flags);
  }

  if (!flags.readonly_role_expected) {
    return buildDbReadonlyProofFail('role_mismatch', flags);
  }

  if (!flags.database_expected) {
    return buildDbReadonlyProofFail('database_mismatch', flags);
  }

  if (!flags.select_allowed_all_scoped_tables) {
    return buildDbReadonlyProofFail('select_missing', flags);
  }

  if (!flags.write_denied_all_scoped_tables) {
    return buildDbReadonlyProofFail('write_privilege_present', flags);
  }

  if (requiredBooleans.every((v) => v === true)) {
    return buildDbReadonlyProofPass(flags);
  }

  return buildDbReadonlyProofFail('db_connect_failed', flags);
}

/**
 * Guarded read-only DB proof handler — fail closed; never uses owner DATABASE_URL.
 * @param {import('express').Request} req
 * @param {{
 *   tokenMatches?: (req: import('express').Request) => boolean,
 *   getReadonlyUrl?: () => string | undefined,
 *   runProbe?: (url: string) => Promise<Record<string, unknown>>,
 * }} [deps]
 */
export async function executeDbReadonlyProof(req, deps = {}) {
  const tokenMatches = deps.tokenMatches ?? opsInfraHealthTokenMatches;
  const configuredCheck = deps.isOpsHealthTokenConfigured ?? isOpsHealthTokenConfigured;
  const presentsToken = deps.requestPresentsOpsToken ?? requestPresentsOpsToken;
  const getReadonlyUrl =
    deps.getReadonlyUrl ??
    (() => normalizeDatabaseUrlEnv(process.env.READ_ONLY_DATABASE_URL));
  const runProbe = deps.runProbe ?? runReadonlyProofProbe;

  if (!configuredCheck()) {
    return buildDbReadonlyProofBlocked('token_invalid', 401);
  }

  if (!presentsToken(req)) {
    return buildDbReadonlyProofBlocked('token_missing', 401);
  }

  if (!tokenMatches(req)) {
    return buildDbReadonlyProofBlocked('token_invalid', 401);
  }

  const readonlyUrl = resolveReadonlyDatabaseUrl(getReadonlyUrl);
  if (!readonlyUrl) {
    return buildDbReadonlyProofBlocked('readonly_url_missing', 503);
  }

  try {
    const flags = await runProbe(readonlyUrl);
    return finalizeReadonlyProofVerdict(flags);
  } catch {
    return buildDbReadonlyProofFail('db_connect_failed');
  }
}
