/**
 * FINAL E2E: Next.js (:3000) + API (:8787) + Stripe CLI listen + Reloadly sandbox.
 * - Selects AWCC (operator value `awcc`), completes Payment Element with test card.
 * - Polls GET /api/topup-orders/:id until fulfillmentStatus=delivered & fulfillmentProvider=reloadly.
 *
 * Prereqs: PostgreSQL, Redis optional, Stripe CLI on PATH, root `.env.local` with
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY + NEXT_PUBLIC_API_URL; `server/.env` with sk_test, Reloadly, awcc map.
 *
 * Usage (repo root): node scripts/webtop-reloadly-browser-e2e.mjs
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = join(root, 'server');

function loadDotEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

async function waitHttpOk(url, ms = 60000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function stopPortWindows(port) {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore' },
    );
  } catch {
    /* ignore */
  }
}

async function startStripeListen() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'stripe',
      [
        'listen',
        '--forward-to',
        'http://127.0.0.1:8787/webhooks/stripe',
      ],
      { shell: true, windowsHide: true },
    );
    let settled = false;
    const tryMatch = (chunk) => {
      if (settled) return;
      const s = chunk.toString();
      const m = s.match(/whsec_[a-zA-Z0-9]+/);
      if (m) {
        settled = true;
        resolve({ proc, whsec: m[0] });
      }
    };
    proc.stdout?.on('data', tryMatch);
    proc.stderr?.on('data', tryMatch);
    proc.on('error', (e) => {
      if (!settled) reject(e);
    });
    setTimeout(() => {
      if (!settled) reject(new Error('timeout waiting for stripe listen whsec'));
    }, 25000);
  });
}

function startApi(whsec) {
  const env = {
    ...process.env,
    STRIPE_WEBHOOK_SECRET: whsec,
    WEBTOPUP_FULFILLMENT_PROVIDER: 'reloadly',
    WEBTOPUP_FULFILLMENT_ASYNC: 'false',
    NODE_ENV: 'development',
  };
  return spawn('node', ['start.js'], {
    cwd: serverDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

function startNext(publicEnv) {
  const env = { ...process.env, ...publicEnv };
  return spawn('npm', ['run', 'dev'], {
    cwd: root,
    env,
    stdio: 'ignore',
    shell: true,
    windowsHide: true,
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fillStripeCard(page) {
  await page
    .waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 120000 })
    .catch(() => page.waitForSelector('iframe[src*="js.stripe.com"]', { timeout: 120000 }));
  await sleep(2500);
  await page.getByRole('tab', { name: /^Card$/i }).click({ timeout: 8000 }).catch(() => {});
  await sleep(800);

  if (process.env.DEBUG_STRIPE_FRAMES === '1') {
    console.log(
      JSON.stringify(
        { phase: 'stripe_frame_urls', urls: page.frames().map((f) => f.url()) },
        null,
        2,
      ),
    );
  }

  const frames = page.frames();
  const byUrl = (sub) => frames.find((f) => f.url().includes(sub));

  const fillIn = async (hint, text) => {
    const fr = byUrl(hint);
    if (!fr) return false;
    const inp = fr.locator('input:visible').first();
    if ((await inp.count()) === 0) return false;
    await inp.click({ timeout: 5000 }).catch(() => {});
    await inp.fill(text, { timeout: 15000 });
    return true;
  };

  let ok =
    (await fillIn('cardNumber', '4242424242424242')) ||
    (await fillIn('card-number', '4242424242424242'));
  if (!ok) {
    const stripeFrames = frames.filter((f) =>
      /elements-inner-payment/i.test(f.url()),
    );
    for (const fr of stripeFrames) {
      const inp = fr.locator('input:visible').first();
      if ((await inp.count()) === 0) continue;
      await inp.fill('4242424242424242');
      ok = true;
      break;
    }
  }
  if (!ok) throw new Error('Stripe: card number field not found');

  await fillIn('cardExpiry', '12 / 34') ||
    (await fillIn('card-expiry', '12 / 34'));
  await fillIn('cardCvc', '123') || (await fillIn('card-cvc', '123'));
  await fillIn('postal', '12345') || (await fillIn('postalCode', '12345'));
}

async function pollOrder(apiBase, orderId, sessionKey) {
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const u = `${apiBase}/api/topup-orders/${encodeURIComponent(orderId)}?sessionKey=${encodeURIComponent(sessionKey)}`;
    const r = await fetch(u);
    if (r.ok) {
      const j = await r.json();
      const o = j?.order;
      if (
        o?.paymentStatus === 'paid' &&
        o?.fulfillmentStatus === 'delivered' &&
        o?.fulfillmentProvider === 'reloadly'
      ) {
        return o;
      }
    }
    await new Promise((x) => setTimeout(x, 1200));
  }
  throw new Error('timeout waiting for delivered+reloadly');
}

async function main() {
  const localEnv = loadDotEnvFile(join(root, '.env.local'));
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || localEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    localEnv.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8787';

  if (!pk?.startsWith('pk_test_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing — set in .env.local');
  }

  console.log(
    JSON.stringify(
      {
        phase: 'precheck',
        NEXT_PUBLIC_API_URL: apiUrl,
        stripePkPrefix: pk.slice(0, 12),
        serverEnvReloadly: existsSync(join(serverDir, '.env')),
      },
      null,
      2,
    ),
  );

  stopPortWindows(8787);
  stopPortWindows(3000);
  await new Promise((r) => setTimeout(r, 800));

  const { proc: stripeProc, whsec } = await startStripeListen();
  console.log(JSON.stringify({ phase: 'stripe_listen', whsecPrefix: whsec.slice(0, 12) }));

  const apiProc = startApi(whsec);
  const apiLog = [];
  apiProc.stdout?.on('data', (d) => apiLog.push(d.toString()));
  apiProc.stderr?.on('data', (d) => apiLog.push(d.toString()));

  const ok8787 = await waitHttpOk('http://127.0.0.1:8787/health', 90000);
  if (!ok8787) {
    stripeProc.kill();
    apiProc.kill();
    throw new Error('API failed to start — log:\n' + apiLog.slice(-5).join(''));
  }

  const nextProc = startNext({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk,
    NEXT_PUBLIC_API_URL: apiUrl,
  });
  const ok3000 = await waitHttpOk('http://127.0.0.1:3000', 120000);
  if (!ok3000) {
    stripeProc.kill();
    apiProc.kill();
    nextProc.kill();
    throw new Error('Next.js failed to start on :3000');
  }

  let orderId = null;
  let sessionKey = null;

  const browser = await chromium.launch({ headless: true, slowMo: 25 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  page.on('response', async (res) => {
    try {
      if (
        res.request().method() === 'POST' &&
        res.url().includes('/api/topup-orders') &&
        !res.url().includes('/mark-paid')
      ) {
        const j = await res.json().catch(() => null);
        if (j?.order?.id && j?.sessionKey) {
          orderId = j.order.id;
          sessionKey = j.sessionKey;
        }
      }
    } catch {
      /* ignore */
    }
  });

  await page.goto('http://127.0.0.1:3000', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForSelector('#operator', { timeout: 30000 });
  await page.selectOption('#operator', 'awcc');
  await sleep(2000);
  const formCard = page.locator('article').filter({ has: page.locator('#form-title') });
  const amountBtn = formCard.locator('[class*="chipRow"] button[type="button"]').first();
  await amountBtn.scrollIntoViewIfNeeded();
  await amountBtn.click({ timeout: 90000 });
  await page.fill('#phone', '7012345678');
  const cta = page.getByRole('button', { name: /continue|متابعة/i });
  await cta.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(
    () => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        /continue|متابعة/i.test(x.textContent ?? ''),
      );
      return b && !b.disabled;
    },
    null,
    { timeout: 60000 },
  );
  await cta.click();

  await page.waitForFunction(
    () => document.querySelectorAll('iframe').length > 0,
    null,
    { timeout: 120000 },
  );

  await fillStripeCard(page);

  const payBtn = page.locator('aside').getByRole('button', { name: /^Pay / });
  await payBtn.click();

  await page.waitForSelector('#order-success-title', { timeout: 180000 }).catch(
    async () => {
      const alert = await page.locator('[role="alert"]').first().textContent().catch(() => null);
      throw new Error(
        `Checkout did not reach success panel. Alert: ${alert ?? 'none'}`,
      );
    },
  );

  if (!orderId || !sessionKey) {
    await browser.close();
    stripeProc.kill();
    apiProc.kill();
    nextProc.kill();
    throw new Error('Could not capture order id from topup-orders response');
  }

  console.log(JSON.stringify({ phase: 'order_captured', orderId, sessionKeyTail: sessionKey.slice(-6) }));

  const order = await pollOrder(apiUrl, orderId, sessionKey);

  const logText = apiLog.join('');
  const reloadlyProof =
    logText.includes('fulfillment_provider_called') &&
    logText.includes('reloadly');
  const autoScheduled = logText.includes('webtop_fulfillment_auto_scheduled');

  console.log(
    JSON.stringify(
      {
        phase: 'result',
        orderId,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        fulfillmentProvider: order.fulfillmentProvider,
        fulfillmentAttemptCount: order.fulfillmentAttemptCount,
        apiLogHasAutoScheduled: autoScheduled,
        apiLogShowsReloadlyProviderCall: reloadlyProof,
      },
      null,
      2,
    ),
  );

  await browser.close();
  stripeProc.kill();
  apiProc.kill();
  nextProc.kill();

  if (
    order.fulfillmentProvider !== 'reloadly' ||
    order.fulfillmentStatus !== 'delivered'
  ) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ phase: 'fatal', message: String(e?.message ?? e) }));
  process.exit(1);
});
