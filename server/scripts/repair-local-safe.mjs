#!/usr/bin/env node
/**
 * Safe local hygiene only — never modifies secrets, never kills processes.
 * Run: npm --prefix server run repair:local-safe
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, '..');
const repoRoot = join(serverRoot, '..');

console.log('[repair:local-safe] Zora-Walat — non-destructive local repair\n');

// 1) Optional temp log cleanup (only obvious patterns under server/)
const tempDirs = [join(serverRoot, 'tmp'), join(serverRoot, 'temp'), join(serverRoot, 'logs')];
let removed = 0;
for (const d of tempDirs) {
  if (!existsSync(d)) continue;
  try {
    for (const name of readdirSync(d)) {
      if (/\.(log|tmp)$/i.test(name)) {
        rmSync(join(d, name), { force: true });
        removed++;
      }
    }
  } catch {
    /* ignore */
  }
}
console.log(`[1] Removed ${removed} *.log/*.tmp files under server tmp/temp/logs (if any)\n`);

// 2) Validate env template exists
const envExample = join(serverRoot, '.env.example');
if (existsSync(envExample)) {
  console.log('[2] PASS: server/.env.example exists\n');
} else {
  console.warn('[2] WARN: server/.env.example missing — add template keys without values\n');
}

// 3) Non-secret doc pointer for Flutter API base URL
const docPath = join(repoRoot, 'docs', 'LOCAL_FLUTTER_API_BASE_URL.md');
try {
  mkdirSync(join(repoRoot, 'docs'), { recursive: true });
  writeFileSync(
    docPath,
    `# Local Flutter API base URL

Run Chrome against the Node API on port **8787**:

\`\`\`text
flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8787
\`\`\`

Source of truth: \`lib/core/config/app_config.dart\` (\`API_BASE_URL\`).

**Do not commit** secrets. Use \`server/.env\` for Stripe/DB locally.
`,
    { encoding: 'utf8' },
  );
  console.log(`[3] Wrote/updated ${docPath}\n`);
} catch (e) {
  console.warn('[3] Could not write docs:', e.message, '\n');
}

// 4) Stale process reminder (never kill)
console.log(
  '[4] Reminder: avoid multiple `node start.js` / duplicate `stripe listen` sessions; restart API after changing STRIPE_WEBHOOK_SECRET.\n',
);

console.log('[repair:local-safe] Done. No secrets were read or modified.\n');
