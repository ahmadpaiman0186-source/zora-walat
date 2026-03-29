import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');

function tryUnlinkEngineArtifacts() {
  const dir = path.join(root, 'node_modules', '.prisma', 'client');
  const candidates = [
    path.join(dir, 'query_engine-windows.dll.node'),
    path.join(dir, 'libquery_engine-windows.dll.node'),
  ];
  for (const p of candidates) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* locked or missing */
    }
  }
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name.includes('.tmp')) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* dir missing */
  }
}

if (!fs.existsSync(prismaCli)) {
  console.warn('postinstall: prisma CLI not found yet; skip generate (run npm install again).');
  process.exit(0);
}

for (let i = 0; i < 5; i++) {
  tryUnlinkEngineArtifacts();
  const r = spawnSync(process.execPath, [prismaCli, 'generate'], {
    cwd: root,
    stdio: 'inherit',
  });
  if (r.status === 0) process.exit(0);
  if (i < 4) {
    console.warn(`prisma generate failed (attempt ${i + 1}/5), retrying in 2s…`);
    await setTimeout(2000);
  }
}

console.error(
  '\nPrisma generate failed. Close other Node processes using this folder, then run: npm run generate\n',
);
process.exit(0);
