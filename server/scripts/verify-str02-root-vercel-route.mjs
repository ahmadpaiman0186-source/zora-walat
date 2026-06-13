#!/usr/bin/env node
/**
 * STR-02 root Vercel route verifier.
 *
 * Static, local-only guard: no network calls, no credentials, no deploy, no
 * endpoint probe. It validates that the repo-root Vercel deployment keeps
 * POST /webhooks/stripe wired to the root serverless bridge and that the bridge
 * reuses the existing slim Stripe webhook handler.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(__dirname, '..', '..');
const REPORT_DIR = 'Ap786/evidence/str02-super-system-route-intelligence-2026-05-24';
const JSON_REPORT = `${REPORT_DIR}/STR02_ROUTE_VERIFIER_REPORT.json`;
const MD_REPORT = 'Ap786/ZORA_WALAT_STR02_SUPER_SYSTEM_ROUTE_VERIFIER_REPORT_2026_05_24.md';

const SECRET_PATTERNS = [
  { id: 'stripe_live_secret_key', regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { id: 'stripe_live_restricted_key', regex: /rk_live_[0-9a-zA-Z]{24,}/ },
  { id: 'stripe_webhook_secret_literal', regex: /whsec_(?!ci)[0-9a-zA-Z]{24,}/ },
];

const DIRECT_MUTATION_PATTERNS = [
  { id: 'prisma_direct_use', regex: /\bprisma\b|\$transaction/ },
  { id: 'payment_mutation_terms', regex: /\b(paymentCheckout|wallet|orderStatus|refund|ledger)\b/i },
  { id: 'direct_db_import', regex: /from ['"].*server\/src\/db\.js['"]|from ['"].*src\/db\.js['"]/ },
];

function readText(path) {
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function check(id, passed, message, details = {}) {
  return {
    id,
    passed: Boolean(passed),
    message,
    details,
  };
}

function pathExists(repoRoot, rel) {
  return existsSync(join(repoRoot, rel));
}

function fileContains(text, needle) {
  return String(text).includes(needle);
}

function hasWebhookRewrite(vercel) {
  const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
  return rewrites.some(
    (r) =>
      r &&
      r.source === '/webhooks/stripe' &&
      r.destination === '/api/webhooks/stripe',
  );
}

function hasDangerousCatchAllRewrite(vercel) {
  const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
  return rewrites.some((r) => {
    if (!r || r.source === '/webhooks/stripe') return false;
    const src = String(r.source ?? '');
    return src === '/(.*)' || src === '/:path*' || src.includes('(.*)');
  });
}

function scanPatterns(text, patterns) {
  return patterns.filter((p) => p.regex.test(text)).map((p) => p.id);
}

export function verifyStr02RootVercelRoute(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const checks = [];

  const rootVercelPath = join(repoRoot, 'vercel.json');
  const bridgePath = join(repoRoot, 'api/webhooks/stripe.mjs');
  const slimHandlerPath = join(repoRoot, 'server/handlers/slimStripeWebhookHandler.mjs');
  const packagePath = join(repoRoot, 'package.json');

  const rootVercelExists = existsSync(rootVercelPath);
  checks.push(check('root_vercel_json_exists', rootVercelExists, 'root vercel.json exists'));

  let vercel = {};
  if (rootVercelExists) {
    try {
      vercel = readJson(rootVercelPath);
      checks.push(check('root_vercel_json_parse', true, 'root vercel.json parses as JSON'));
    } catch (error) {
      checks.push(
        check('root_vercel_json_parse', false, 'root vercel.json failed to parse', {
          error: String(error?.message ?? error),
        }),
      );
    }
  }

  checks.push(
    check(
      'webhook_rewrite_declared',
      hasWebhookRewrite(vercel),
      'root rewrite maps /webhooks/stripe to /api/webhooks/stripe',
      { expected: { source: '/webhooks/stripe', destination: '/api/webhooks/stripe' } },
    ),
  );
  checks.push(
    check(
      'frontend_rewrites_not_catchall',
      !hasDangerousCatchAllRewrite(vercel),
      'root vercel.json does not add broad catch-all rewrites over frontend routes',
    ),
  );
  checks.push(
    check(
      'server_dependencies_installed_in_root_build',
      typeof vercel.installCommand === 'string' &&
        vercel.installCommand.includes('npm --prefix server install --include=dev'),
      'root install command installs server dependencies required by webhook bridge',
    ),
  );

  const bridgeExists = existsSync(bridgePath);
  checks.push(check('root_webhook_bridge_exists', bridgeExists, 'api/webhooks/stripe.mjs exists'));

  const slimHandlerExists = existsSync(slimHandlerPath);
  checks.push(
    check(
      'slim_stripe_handler_exists',
      slimHandlerExists,
      'server/handlers/slimStripeWebhookHandler.mjs exists',
    ),
  );

  let bridge = '';
  if (bridgeExists) bridge = readText(bridgePath);

  checks.push(
    check(
      'bridge_reuses_slim_handler',
      bridgeExists &&
        fileContains(bridge, 'slimStripeWebhookHandler.mjs') &&
        fileContains(bridge, 'handleSlimStripeWebhookPost'),
      'root bridge imports/reuses existing slim Stripe webhook handler',
    ),
  );
  checks.push(
    check(
      'bridge_normalizes_to_webhook_path',
      bridgeExists && fileContains(bridge, '/webhooks/stripe'),
      'root bridge preserves /webhooks/stripe before slim handler handoff',
    ),
  );
  checks.push(
    check(
      'unsupported_methods_fail_closed',
      bridgeExists &&
        /req\.method\s*!==\s*['"]POST['"]/.test(bridge) &&
        /status\(405\)|statusCode\s*=\s*405/.test(bridge) &&
        /Allow['"],\s*['"]POST/.test(bridge),
      'bridge rejects unsupported methods with POST-only fail-closed behavior',
    ),
  );

  const secretHits = bridgeExists ? scanPatterns(bridge, SECRET_PATTERNS) : [];
  checks.push(
    check('no_secret_literals_in_bridge', secretHits.length === 0, 'bridge has no obvious secret literals', {
      hits: secretHits,
    }),
  );

  const mutationHits = bridgeExists ? scanPatterns(bridge, DIRECT_MUTATION_PATTERNS) : [];
  checks.push(
    check(
      'no_direct_money_mutation_in_bridge',
      mutationHits.length === 0,
      'bridge does not directly import DB/payment mutation code',
      { hits: mutationHits },
    ),
  );

  checks.push(
    check(
      'bridge_does_not_change_env_names',
      bridgeExists && !/process\.env|STRIPE_|DATABASE_URL|WEBHOOK_SECRET/.test(bridge),
      'bridge does not introduce or rename env variables',
    ),
  );

  const frontendRoutes = [
    'app/page.tsx',
    'app/history/page.tsx',
    'app/success/page.tsx',
    'app/cancel/page.tsx',
  ];
  const missingFrontendRoutes = frontendRoutes.filter((p) => !pathExists(repoRoot, p));
  checks.push(
    check(
      'frontend_routes_preserved',
      missingFrontendRoutes.length === 0,
      'existing frontend route files remain present',
      { required: frontendRoutes, missing: missingFrontendRoutes },
    ),
  );

  let pkg = {};
  const pkgExists = existsSync(packagePath);
  if (pkgExists) {
    try {
      pkg = readJson(packagePath);
    } catch {
      pkg = {};
    }
  }
  checks.push(
    check(
      'root_npm_script_registered',
      pkg?.scripts?.['verify:str02-route'] ===
        'node server/scripts/verify-str02-root-vercel-route.mjs',
      'root npm script verify:str02-route is registered',
    ),
  );

  const passed = checks.every((c) => c.passed);
  return {
    schemaVersion: 1,
    reportType: 'STR02_ROOT_VERCEL_ROUTE_VERIFIER',
    status: passed ? 'PASS' : 'FAIL',
    implementationMerged: true,
    staticRouteBridgeVerification: passed ? 'PASS' : 'FAIL',
    deployedVercelRouteSurface: 'PENDING',
    http200: 'NOT_ACHIEVED',
    stripeResendAfterFix: 'NOT_AUTHORIZED_NOT_EXECUTED',
    fixProven: 'NOT_YET',
    productionRealMoneyPilot: 'NO_GO',
    selfHealingApply: 'GATED_NOT_ENABLED',
    repoRoot,
    checkedFiles: {
      rootVercel: 'vercel.json',
      rootBridge: 'api/webhooks/stripe.mjs',
      slimHandler: 'server/handlers/slimStripeWebhookHandler.mjs',
      packageJson: 'package.json',
    },
    checks,
  };
}

function renderMarkdown(report) {
  const rows = report.checks
    .map(
      (c) =>
        `| ${c.id} | ${c.passed ? '**PASS**' : '**FAIL**'} | ${c.message.replace(/\|/g, '\\|')} |`,
    )
    .join('\n');
  return `# STR-02 Super-System Route Verifier Report

**Date:** 2026-05-24
**Report type:** ${report.reportType}
**Static route bridge verification:** **${report.staticRouteBridgeVerification}**

**Policy:** Static local verification only. No deploy, no redeploy, no Vercel/Stripe API call, no endpoint probe, no DB/payment mutation.

---

## Check Results

| Check | Result | Message |
|-------|--------|---------|
${rows}

---

## Conservative Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| Static route bridge verification | **${report.staticRouteBridgeVerification}** |
| Deployed Vercel route surface | **PENDING** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Generated by \`server/scripts/verify-str02-root-vercel-route.mjs\`.*\n`;
}

export function writeVerifierReports(report, repoRoot = DEFAULT_REPO_ROOT) {
  const jsonPath = join(repoRoot, JSON_REPORT);
  const mdPath = join(repoRoot, MD_REPORT);
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath, mdPath };
}

function argValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const repoRoot = resolve(argValue('--repo-root') ?? DEFAULT_REPO_ROOT);
  const report = verifyStr02RootVercelRoute({ repoRoot });
  writeVerifierReports(report, repoRoot);
  process.stdout.write(`${JSON.stringify({ status: report.status, report: JSON_REPORT })}\n`);
  if (report.status !== 'PASS') process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
