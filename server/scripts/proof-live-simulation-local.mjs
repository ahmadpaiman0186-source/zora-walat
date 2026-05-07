#!/usr/bin/env node
/**
 * Launcher: runs the live simulation proof in a child process with a pinned production-like
 * environment (test Stripe keys only). Sets `ZW_LIVE_SIMULATION_PROOF=true` so `bootstrap.js`
 * pins flags after dotenv (see `proof-live-simulation-body.mjs` for the simulated profile).
 *
 * Run: npm --prefix server run proof:live-simulation-local
 *
 * Optional: `ZW_LIVE_SIM_RUN_RELEASE_GATE=true` appends `npm run release:gate` (long; needs Flutter).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..');
const body = join(__dirname, 'proof-live-simulation-body.mjs');

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

/** `bootstrap.js` applies the full production-like pin when this is true (after dotenv). */
const childEnv = {
  ...process.env,
  ZW_LIVE_SIMULATION_PROOF: 'true',
};

const r = spawnSync(process.execPath, [body], {
  cwd: serverDir,
  env: childEnv,
  stdio: 'inherit',
});

const code = r.status === null ? 1 : r.status;
if (code !== 0) {
  process.exit(code);
}

if (String(process.env.ZW_LIVE_SIM_RUN_RELEASE_GATE ?? '').trim().toLowerCase() === 'true') {
  // eslint-disable-next-line no-console -- operator banner
  console.log('\n[live-simulation] ZW_LIVE_SIM_RUN_RELEASE_GATE=true — running full release:gate …\n');
  const rg = spawnSync(npm, ['run', 'release:gate'], {
    cwd: serverDir,
    env: { ...process.env },
    stdio: 'inherit',
  });
  process.exit(rg.status === null ? 1 : rg.status);
}

process.exit(0);
