/**
 * Prints RELOADLY_* / AIRTIME_PROVIDER line numbers and value lengths only (no secrets).
 * Usage: node scripts/reloadly-env-shape-audit.mjs
 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(join(serverRoot, '.env'), 'utf8');
const byKey = {};
for (const [i, line] of raw.split(/\r?\n/).entries()) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 1) continue;
  const k = t.slice(0, eq).trim();
  if (!k.startsWith('RELOADLY') && k !== 'AIRTIME_PROVIDER') continue;
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!byKey[k]) byKey[k] = [];
  byKey[k].push({ line: i + 1, valueLen: v.length });
}
console.log(JSON.stringify({ file: '.env', keys: byKey }, null, 2));
