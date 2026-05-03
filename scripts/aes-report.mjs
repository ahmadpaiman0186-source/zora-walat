#!/usr/bin/env node
/**
 * Human-readable AES operations report (no secrets).
 * Uses latest health sweep + optional tail of logs/aes.log
 */
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

import { AES_LOG_PATH } from './aes-internal.mjs';
import { runHealthOnce } from './aes-health.mjs';

function tailLog(maxLines = 25) {
  if (!existsSync(AES_LOG_PATH)) {
    return '(no aes.log yet)';
  }
  const text = readFileSync(AES_LOG_PATH, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

async function main() {
  const r = await runHealthOnce();

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Zora-Walat — AES Operations Report (AES v2)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Time (UTC): ${r.timestamp}`);
  console.log(`  Severity:   ${r.severity}`);
  console.log(`  Repo:       ${r.repoRoot}`);
  console.log('──────────────────────────────────────────────────────────────');

  const c = r.checks;
  console.log('  Stripe PK (root):', c.stripePublishableKeyRoot?.valid ? 'OK' : 'FAIL');
  console.log('  API :8787:       ', c.apiServerPort8787?.listening ? 'listening' : 'closed');
  console.log('  Next :3000:      ', c.nextDevPort3000?.listening ? 'in use' : 'free');
  console.log('  HTTP /health:    ', c.apiHttpReachable?.ok ? `OK (${c.apiHttpReachable.status})` : 'FAIL');
  console.log('  NEXT_PUBLIC_API: ', c.nextPublicApiUrlConfigured ? 'set' : 'missing');
  console.log(
    '  Database:        ',
    c.databaseConnectivity?.ok
      ? 'ok'
      : c.databaseConnectivity?.probed === false
        ? '(probe skipped)'
        : 'FAIL',
  );
  console.log(
    '  Git dirty lines: ',
    c.gitWorkingCopy?.supported ? String(c.gitWorkingCopy.dirtyLineCount ?? '?') : 'n/a',
  );
  console.log(
    '  Webhook secret:  ',
    c.stripeWebhookSecret?.looksConfigured ? 'present (whsec_*)' : 'missing/malformed',
  );
  console.log(
    '  Redis URL:       ',
    c.redisConfigured?.redisUrlConfigured ? 'configured' : 'not set',
  );
  const mig = c.prismaMigrationDrift;
  if (mig?.probed && mig.pendingCount != null) {
    console.log(
      '  Prisma migrations:',
      mig.pendingCount === 0 ? 'up to date' : `${mig.pendingCount} pending (run db:migrate)`,
    );
  } else if (mig?.supported === false || mig?.reason) {
    console.log('  Prisma migrations:', '(check unavailable)');
  } else {
    console.log('  Prisma migrations:', '(not probed)');
  }
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Hints:');
  const hints = r.hints ?? {};
  for (const [k, v] of Object.entries(hints)) {
    if (v) console.log(`    • ${k}: ${v}`);
  }
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  Recent AES log (last lines, JSON — no secrets):`);
  console.log(tailLog(20));
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
