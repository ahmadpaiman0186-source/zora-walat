#!/usr/bin/env node
/**
 * Fail fast when Vercel deploy is run from monorepo root (ships Next.js to API staging).
 * Run from server/ only: npm run deploy:staging:guard
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const vercelPath = resolve(cwd, 'vercel.json');
const pkgPath = resolve(cwd, 'package.json');
const apiIndexPath = resolve(cwd, 'api/index.mjs');

function fail(msg) {
  process.stderr.write(`DEPLOY_GUARD_FAIL ${msg}\n`);
  process.stderr.write(
    'DEPLOY_GUARD_HINT cd C:\\Users\\ahmad\\zora_walat\\server then vercel deploy --prod --yes\n',
  );
  process.exit(1);
}

if (!existsSync(pkgPath)) fail('package.json_missing');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (pkg.name !== 'zora-walat-api') {
  fail('wrong_package_name_expected_zora_walat_api');
}

if (existsSync(resolve(cwd, '..', 'next.config.js')) && !existsSync(resolve(cwd, 'api/index.mjs'))) {
  fail('monorepo_root_detected_use_server_directory');
}

if (!existsSync(apiIndexPath)) fail('api_index_missing');
if (!existsSync(vercelPath)) fail('vercel_json_missing');

const vercel = JSON.parse(readFileSync(vercelPath, 'utf8'));
const routes = Array.isArray(vercel.routes) ? vercel.routes : [];
const hasApiCatchAll = routes.some(
  (r) =>
    r &&
    typeof r.dest === 'string' &&
    r.dest.includes('api/index'),
);
if (!hasApiCatchAll) {
  fail('vercel_json_must_route_to_api_index');
}

if (vercel.framework === 'nextjs') {
  fail('vercel_json_must_not_use_nextjs_framework_for_api_project');
}

process.stdout.write('DEPLOY_GUARD_PASS true\n');
process.stdout.write('DEPLOY_GUARD_ROOT server_api_project\n');
