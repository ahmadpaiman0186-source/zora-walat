/**
 * Fail fast if Next.js top-up entry files are missing (e.g. wrong Vercel Root Directory
 * or incomplete Git checkout). Does not print secrets.
 */
import fs from 'node:fs';

const required = [
  'components/topup/ZoraWalatTopUp.tsx',
  'components/topup/OrderHistoryPage.tsx',
];

let ok = true;
for (const rel of required) {
  if (!fs.existsSync(rel)) {
    console.error(`[prebuild] Missing required file: ${rel}`);
    ok = false;
  }
}
if (!ok) {
  process.exit(1);
}
