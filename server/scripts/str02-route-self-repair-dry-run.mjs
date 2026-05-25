#!/usr/bin/env node
/**
 * STR-02 route self-repair dry-run recommender.
 *
 * Reads the verifier report and emits recommendations only. Apply mode is
 * intentionally unsupported in this branch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const verifierReportPath = join(
  repoRoot,
  'Ap786/evidence/str02-super-system-route-intelligence-2026-05-24/STR02_ROUTE_VERIFIER_REPORT.json',
);
const dryRunReportPath = join(
  repoRoot,
  'Ap786/ZORA_WALAT_STR02_SELF_REPAIR_DRY_RUN_REPORT_2026_05_24.md',
);

function readVerifierReport() {
  if (!existsSync(verifierReportPath)) {
    return {
      status: 'MISSING_REPORT',
      checks: [],
    };
  }
  return JSON.parse(readFileSync(verifierReportPath, 'utf8'));
}

function failed(report, id) {
  return report.checks?.some((c) => c.id === id && !c.passed);
}

export function buildDryRunRecommendation(report) {
  const detected = [];
  const recommendations = [];

  if (report.status === 'PASS') {
    detected.push('No static route-bridge failure detected.');
    recommendations.push('No code patch recommended by dry-run. Capture Vercel route-surface screenshots next.');
  }
  if (failed(report, 'webhook_rewrite_declared')) {
    detected.push('H-routing: missing /webhooks/stripe root rewrite.');
    recommendations.push('Add exact root vercel.json rewrite /webhooks/stripe -> /api/webhooks/stripe.');
  }
  if (failed(report, 'root_webhook_bridge_exists')) {
    detected.push('H4: root serverless bridge api/webhooks/stripe.mjs missing.');
    recommendations.push('Add root api/webhooks/stripe.mjs bridge that delegates to slim Stripe handler.');
  }
  if (failed(report, 'bridge_reuses_slim_handler')) {
    detected.push('H4: bridge does not reuse existing slim Stripe webhook handler.');
    recommendations.push('Replace duplicate logic with handleSlimStripeWebhookPost handoff.');
  }
  if (failed(report, 'unsupported_methods_fail_closed')) {
    detected.push('H-routing: unsupported webhook methods do not visibly fail closed.');
    recommendations.push('Add POST-only guard returning 405 with Allow: POST.');
  }
  if (failed(report, 'no_direct_money_mutation_in_bridge')) {
    detected.push('Risk: direct DB/payment mutation code appears in bridge.');
    recommendations.push('Remove direct mutation from bridge; delegate through existing verified slim path.');
  }

  return {
    detected,
    likelyCause:
      report.status === 'PASS'
        ? 'Static root route bridge appears present. Remaining uncertainty is deployed Vercel route surface and HTTP evidence.'
        : 'One or more static root route bridge invariants failed.',
    recommendedPatch: recommendations,
    risk:
      'Any repair must remain routing-only, preserve raw body/signature verification, avoid env/DB/payment changes, and require human approval.',
    rollback:
      'Revert routing bridge PR or remove exact rewrite; no DB rollback should be needed for routing-only changes.',
    requiresHumanApproval:
      'Any apply mode, deploy, endpoint probe, or Stripe resend requires separate explicit human approval.',
  };
}

function renderMarkdown(report, rec) {
  const detected = rec.detected.map((x) => `- ${x}`).join('\n');
  const patches = rec.recommendedPatch.map((x) => `- ${x}`).join('\n');
  return `# STR-02 Self-Repair Dry-Run Report

**Date:** 2026-05-24
**Mode:** **DRY-RUN ONLY**
**Apply mode:** **UNSUPPORTED / DISABLED**
**Verifier status:** **${report.status}**

**Policy:** No file mutation, no deploy, no endpoint probe, no Stripe/Vercel API call, no DB/payment mutation, no self-healing apply.

---

## DETECTED

${detected || '- None'}

## LIKELY_CAUSE

${rec.likelyCause}

## RECOMMENDED_PATCH

${patches || '- None'}

## RISK

${rec.risk}

## ROLLBACK

${rec.rollback}

## REQUIRES_HUMAN_APPROVAL

${rec.requiresHumanApproval}

---

## Conservative Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| Static route bridge verification | **${report.status === 'PASS' ? 'PASS' : 'FAIL'}** |
| Deployed Vercel route surface | **PENDING** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Self-repair dry-run only - no apply path available.*\n`;
}

async function main() {
  if (process.argv.includes('--apply')) {
    console.error('STR02_SELF_REPAIR_APPLY_UNSUPPORTED');
    process.exit(2);
  }
  const report = readVerifierReport();
  const rec = buildDryRunRecommendation(report);
  mkdirSync(dirname(dryRunReportPath), { recursive: true });
  writeFileSync(dryRunReportPath, renderMarkdown(report, rec));
  process.stdout.write(`${JSON.stringify({ status: 'DRY_RUN_COMPLETE', verifierStatus: report.status })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
