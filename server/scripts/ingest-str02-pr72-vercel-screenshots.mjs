#!/usr/bin/env node
/**
 * STR-02 PR72 Vercel screenshot ingestion helper.
 *
 * Local-only: searches operator folders for already-provided image files whose
 * filenames match expected PR72 evidence patterns. No OCR, browser access,
 * credentials, network calls, API calls, deploys, or endpoint probes.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const evidenceDir = join(
  repoRoot,
  'Ap786/evidence/str02-pr72-postmerge-vercel-route-evidence-2026-05-24',
);
const reportPath = join(
  repoRoot,
  'Ap786/evidence/str02-super-system-route-intelligence-2026-05-24/STR02_EVIDENCE_INGESTION_REPORT.json',
);
const mdReportPath = join(
  repoRoot,
  'Ap786/ZORA_WALAT_STR02_EVIDENCE_INGESTION_REPORT_2026_05_24.md',
);

const expected = [
  {
    id: 'PR72-D01',
    file: 'VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-001.png',
    patterns: [/PR72.*SOURCE.*COMMIT.*001/i, /LATEST.*DEPLOYMENT.*SOURCE.*COMMIT/i],
  },
  {
    id: 'PR72-D02',
    file: 'VERCEL-PR72-BUILD-OUTPUT-002.png',
    patterns: [/PR72.*BUILD.*OUTPUT.*002/i, /BUILD.*OUTPUT/i],
  },
  {
    id: 'PR72-D03',
    file: 'VERCEL-PR72-DEPLOYMENT-FUNCTIONS-ROUTES-003.png',
    patterns: [/PR72.*FUNCTIONS.*ROUTES.*003/i, /DEPLOYMENT.*FUNCTIONS.*ROUTES/i],
  },
  {
    id: 'PR72-D04',
    file: 'VERCEL-PR72-ROUTE-REWRITE-WEBHOOK-STRIPE-004.png',
    patterns: [/PR72.*ROUTE.*REWRITE.*004/i, /WEBHOOK.*STRIPE.*004/i],
  },
  {
    id: 'PR72-D05',
    file: 'VERCEL-PR72-DOMAIN-MAPPING-005.png',
    patterns: [/PR72.*DOMAIN.*005/i, /DOMAIN.*MAPPING/i],
  },
  {
    id: 'PR72-D06',
    file: 'VERCEL-PR72-LOGS-WEBHOOK-STRIPE-SEARCH-006.png',
    patterns: [/PR72.*LOGS.*WEBHOOK.*006/i, /WEBHOOK.*STRIPE.*SEARCH.*006/i],
  },
  {
    id: 'PR72-D07',
    file: 'VERCEL-PR72-LOGS-STRIPE-SEARCH-007.png',
    patterns: [/PR72.*LOGS.*STRIPE.*007/i, /STRIPE.*SEARCH.*007/i],
  },
];

function candidateRoots() {
  const home = homedir();
  const roots = [
    join(home, 'Downloads'),
    join(home, 'Pictures', 'Screenshots'),
    join(home, 'Desktop'),
    join(home, 'Downloads', 'Telegram Desktop'),
  ];
  const packages = join(home, 'AppData', 'Local', 'Packages');
  if (existsSync(packages)) {
    for (const name of readdirSync(packages)) {
      if (name.startsWith('TelegramMessengerLLP.TelegramDesktop_')) {
        roots.push(join(packages, name, 'LocalCache', 'Roaming', 'Telegram Desktop'));
      }
    }
  }
  return roots.filter((p) => existsSync(p));
}

function walkImages(root, acc = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) {
      walkImages(p, acc);
    } else if (entry.isFile() && /\.(png|jpe?g)$/i.test(entry.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function newestFirst(paths) {
  return paths
    .map((p) => ({ path: p, mtimeMs: statSync(p).mtimeMs, name: p.split(/[\\/]/).pop() }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function matchExpected(images, spec) {
  return images.find((img) => spec.patterns.some((re) => re.test(img.name)));
}

function renderMarkdown(report) {
  const rows = report.results
    .map((r) => `| ${r.id} | \`${r.file}\` | **${r.status}** | ${r.source ?? '-'} |`)
    .join('\n');
  return `# STR-02 PR72 Evidence Ingestion Report

**Date:** 2026-05-24
**Status:** **${report.status}**

**Policy:** Local screenshot ingestion only. No OCR, API calls, endpoint probes, deploys, settings edits, Stripe actions, or DB/payment mutation.

---

| Evidence ID | Target filename | Status | Source |
|-------------|-----------------|--------|--------|
${rows}

---

## Conservative Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| Static route bridge verification | **PASS** |
| Deployed Vercel route surface | **PENDING** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |
\n`;
}

export function ingestPr72Screenshots() {
  const roots = candidateRoots();
  const images = newestFirst(roots.flatMap((r) => walkImages(r)));
  mkdirSync(evidenceDir, { recursive: true });

  const results = expected.map((spec) => {
    const match = matchExpected(images, spec);
    if (!match) {
      return { id: spec.id, file: spec.file, status: 'PENDING_CAPTURE' };
    }
    if (!/\.png$/i.test(match.name)) {
      return {
        id: spec.id,
        file: spec.file,
        status: 'PENDING_CAPTURE_NON_PNG_SOURCE_REQUIRES_MANUAL_CONVERSION',
        source: match.path,
      };
    }
    copyFileSync(match.path, join(evidenceDir, spec.file));
    return { id: spec.id, file: spec.file, status: 'INGESTED', source: match.path };
  });

  const ingested = results.filter((r) => r.status === 'INGESTED').length;
  const report = {
    schemaVersion: 1,
    reportType: 'STR02_PR72_EVIDENCE_INGESTION',
    status: ingested > 0 ? 'PARTIAL_INGESTED' : 'PENDING_CAPTURE',
    searchedRoots: roots,
    imagesConsidered: images.length,
    results,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdReportPath, renderMarkdown(report));
  return report;
}

async function main() {
  const report = ingestPr72Screenshots();
  process.stdout.write(`${JSON.stringify({ status: report.status, ingested: report.results.filter((r) => r.status === 'INGESTED').length })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
