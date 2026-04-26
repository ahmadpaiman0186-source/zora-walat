/**
 * E2E: Chromium + Flutter web origin → POST /create-checkout-session → Stripe hosted checkout
 * → test card → redirect to ${origin}/success (webhook verified separately via API logs).
 *
 * Ports (no stale defaults):
 *   API_BASE_URL=http://127.0.0.1:8787
 *   APP_BASE_URL=http://localhost:51998  (Flutter web origin; overrides port probing)
 *   FLUTTER_ORIGIN / FLUTTER_WEB_URL — same role as APP_BASE_URL
 *
 *   node scripts/flutter-web-checkout-live.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { detectFlutterOrigin } from './lib/detectFlutterOrigin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const lastUrlPath = join(repoRoot, 'server', '_last_checkout_url.txt');

const API =
  process.env.API_BASE_URL?.trim() || 'http://127.0.0.1:8787';

async function resolveAppOrigin() {
  const d = await detectFlutterOrigin();
  if (!d) {
    throw new Error(
      'Could not detect Flutter web origin. Set APP_BASE_URL=http://localhost:<port> or FLUTTER_ORIGIN=…\n' +
        'Example: flutter run -d web-server --web-hostname=localhost --web-port=51998 --dart-define=API_BASE_URL=http://127.0.0.1:8787',
    );
  }
  return d;
}

async function registerUser() {
  const email = `e2e_${Date.now()}_${Math.random().toString(16).slice(2)}@test.local`;
  const r = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass1234!' }),
  });
  const text = await r.text();
  const j = JSON.parse(text);
  if (!r.ok) throw new Error(`register ${r.status}: ${text.slice(0, 400)}`);
  return {
    email,
    access: j.accessToken,
    refresh: j.refreshToken,
    user: j.user,
  };
}

/**
 * Stripe Checkout (hosted): expand card accordion → fill test card (scan Stripe iframes) → Pay.
 */
async function payStripeCheckout(page) {
  await page.waitForURL(/checkout\.stripe\.com/i, { timeout: 120000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 8000 }).catch(() => false)) {
    await emailInput.fill('e2e@test.local');
  }

  const expanders = [
    '[data-testid="card-accordion-item-button"]',
    'button[data-testid="payment-method-accordion-item-button"]',
    'button:has-text("Card")',
  ];
  for (const sel of expanders) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click({ force: true });
      await page.waitForTimeout(2000);
      break;
    }
  }

  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('iframe')].some((f) => {
        const s = f.getAttribute('src') || '';
        return s.includes('js.stripe.com') && !s.includes('link-login');
      }),
    null,
    { timeout: 120000 },
  );

  await page.waitForTimeout(1500);

  let filledPan = false;
  let filledExp = false;
  let filledCvc = false;

  const tryNamedSelectors = async (frame) => {
    const panLoc = frame.locator(
      'input[name="cardnumber"], input[name="number"], input[autocomplete="cc-number"]',
    );
    if (!filledPan && (await panLoc.count()) > 0) {
      const el = panLoc.first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.fill('4242424242424242');
        filledPan = true;
      }
    }
    const expLoc = frame.locator(
      'input[name="exp-date"], input[name="expiry"], input[autocomplete="cc-exp"]',
    );
    if (!filledExp && (await expLoc.count()) > 0) {
      const el = expLoc.first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.fill('1234');
        filledExp = true;
      }
    }
    const cvcLoc = frame.locator('input[name="cvc"], input[autocomplete="cc-csc"]');
    if (!filledCvc && (await cvcLoc.count()) > 0) {
      const el = cvcLoc.first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.fill('123');
        filledCvc = true;
      }
    }
  };

  const tryFillInputs = async (frame) => {
    await tryNamedSelectors(frame);
    const loc = frame.locator('input');
    const n = await loc.count();
    for (let k = 0; k < n; k++) {
      const inp = loc.nth(k);
      const vis = await inp.isVisible({ timeout: 400 }).catch(() => false);
      if (!vis) continue;
      const name = (await inp.getAttribute('name')) || '';
      const ph = (await inp.getAttribute('placeholder')) || '';
      const aria = (await inp.getAttribute('aria-label')) || '';
      const id = (await inp.getAttribute('id')) || '';
      const key = `${name} ${ph} ${aria} ${id}`.toLowerCase();

      if (
        !filledPan &&
        (name === 'cardnumber' ||
          name === 'number' ||
          key.includes('1234') ||
          key.includes('card number') ||
          key.includes('cardnumber'))
      ) {
        await inp.fill('4242424242424242');
        filledPan = true;
        continue;
      }
      if (
        !filledExp &&
        (name === 'exp-date' ||
          name === 'expiry' ||
          ph.includes('MM') ||
          key.includes('expir') ||
          key.includes('mm / yy'))
      ) {
        await inp.fill('1234');
        filledExp = true;
        continue;
      }
      if (
        !filledCvc &&
        (name === 'cvc' || key.includes('cvc') || key.includes('security'))
      ) {
        await inp.fill('123');
        filledCvc = true;
      }
    }
  };

  for (let attempt = 0; attempt < 25 && !(filledPan && filledExp && filledCvc); attempt++) {
    for (const frame of page.frames()) {
      await tryFillInputs(frame);
    }
    if (filledPan && filledExp && filledCvc) break;
    await page.waitForTimeout(700);
  }

  if (!filledPan) {
    throw new Error(
      'Stripe checkout: could not find card number field in Stripe frames (layout changed?)',
    );
  }
  if (!filledExp) {
    throw new Error('Stripe checkout: could not find expiry field');
  }
  if (!filledCvc) {
    throw new Error('Stripe checkout: could not find CVC field');
  }

  const billing = page.locator('input[name="billingName"], input[name="name"]').first();
  if (await billing.isVisible({ timeout: 4000 }).catch(() => false)) {
    await billing.fill('E2E Test');
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const countryCombo = page.getByRole('combobox', { name: /Country or region/i });
  if (await countryCombo.isVisible({ timeout: 5000 }).catch(() => false)) {
    await countryCombo.click({ force: true });
    await page.waitForTimeout(400);
    await page.keyboard.press('Control+a');
    await page.keyboard.type('United States');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }

  const postal = page
    .locator(
      'input[name="billingPostalCode"], input[name="postal"], input[name="zip"], input[autocomplete="postal-code"]',
    )
    .first();
  if (await postal.isVisible({ timeout: 6000 }).catch(() => false)) {
    await postal.fill('10001');
  }

  const submitPay = page.getByTestId('hosted-payment-submit-button');
  await submitPay.waitFor({ state: 'visible', timeout: 90000 });
  await expectSubmitEnabled(submitPay);

  try {
    await Promise.all([
      page.waitForURL(
        (u) => /session_id=/i.test(u.href) || /\/success/i.test(u.pathname),
        { timeout: 240000 },
      ),
      submitPay.click(),
    ]);
  } catch (e) {
    const u = page.url();
    const snippet = await page
      .evaluate(() => (document.body?.innerText || '').trim().slice(0, 1200))
      .catch(() => '');
    console.error('[live] pay redirect failed; url=', u);
    console.error('[live] body snippet=', snippet);
    throw e;
  }
}

async function expectSubmitEnabled(locator) {
  const dead = Date.now() + 90000;
  while (Date.now() < dead) {
    const disabled = await locator.getAttribute('aria-disabled');
    if (disabled !== 'true') return;
    await locator.page().waitForTimeout(400);
  }
  throw new Error('Stripe Pay button stayed disabled (validation incomplete?)');
}

async function main() {
  const APP = await resolveAppOrigin();
  console.log('[live] API_BASE_URL=', API);
  console.log('[live] FLUTTER_ORIGIN=', APP);

  writeFileSync(
    join(repoRoot, 'scripts', 'local-dev-ports.generated.json'),
    JSON.stringify(
      { API_BASE_URL: API, FLUTTER_ORIGIN: APP, generatedAt: new Date().toISOString() },
      null,
      2,
    ),
    'utf8',
  );

  const { access, refresh, user } = await registerUser();
  console.log('[live] registered', user.email);

  const headless = process.env.HEADLESS !== '0';
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();

  await context.addInitScript(
    ({ access: a, refresh: r, userId, userEmail, userRole }) => {
      const enc = (s) => JSON.stringify(s);
      localStorage.setItem('flutter.zw_access_token', enc(a));
      localStorage.setItem('flutter.zw_refresh_token', enc(r));
      localStorage.setItem('flutter.zw_user_id', enc(userId));
      localStorage.setItem('flutter.zw_user_email', enc(userEmail));
      localStorage.setItem('flutter.zw_user_role', enc(userRole));
    },
    {
      access,
      refresh,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    },
  );

  const page = await context.newPage();
  const consoleLines = [];
  page.on('console', (msg) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${String(err)}`));

  await page.goto(`${APP}/recharge`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });

  await page.waitForTimeout(3000);

  const checkoutResult = await page.evaluate(
    async ({ api }) => {
      const raw = localStorage.getItem('flutter.zw_access_token');
      if (raw == null) return { error: 'no_access_token_key' };
      let token;
      try {
        token = JSON.parse(raw);
      } catch (e) {
        return { error: 'token_parse', detail: String(e) };
      }
      if (typeof token !== 'string' || !token.length) {
        return { error: 'token_not_string' };
      }
      const idem = globalThis.crypto.randomUUID();
      const r = await fetch(`${api}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idem,
          Origin: new URL(location.href).origin,
        },
        body: JSON.stringify({
          currency: 'usd',
          senderCountry: 'US',
          amountUsdCents: 1000,
          operatorKey: 'roshan',
          recipientPhone: '07012345678',
        }),
      });
      const text = await r.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      return {
        status: r.status,
        ok: r.ok,
        parsed,
      };
    },
    { api: API },
  );

  console.log(
    '[live] fetch /create-checkout-session',
    JSON.stringify(checkoutResult, null, 2),
  );

  const url =
    checkoutResult.parsed &&
    typeof checkoutResult.parsed === 'object' &&
    checkoutResult.parsed.url
      ? checkoutResult.parsed.url
      : null;

  if (!checkoutResult.ok || !url || typeof url !== 'string') {
    await browser.close();
    throw new Error(
      `Checkout session did not return usable url: ${JSON.stringify(checkoutResult)}`,
    );
  }

  if (!url.startsWith('https://checkout.stripe.com/')) {
    await browser.close();
    throw new Error(`Expected Stripe checkout URL, got: ${url.slice(0, 80)}`);
  }

  writeFileSync(lastUrlPath, `${url}\n`, 'utf8');
  console.log('[live] wrote', lastUrlPath);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await payStripeCheckout(page);

  const finalUrl = page.url();
  const successTextLen = await page.evaluate(
    () => (document.body?.innerText || '').trim().length,
  );
  await browser.close();

  const successReached =
    /\/success/.test(finalUrl) &&
    /session_id=/.test(finalUrl) &&
    /order_id=/.test(finalUrl);

  const report = {
    api: API,
    flutterOrigin: APP,
    fetchStatus: checkoutResult.status,
    stripeUrlPrefix: url.slice(0, 80),
    finalUrl: finalUrl.slice(0, 220),
    successReached,
    successTextLen,
    consoleTail: consoleLines.slice(-20),
  };

  console.log('[live] PASS report', JSON.stringify(report, null, 2));

  if (!successReached) {
    process.exitCode = 1;
    throw new Error(
      `Expected /success with session_id & order_id, got: ${finalUrl}`,
    );
  }
  if (successTextLen < 40) {
    process.exitCode = 1;
    throw new Error(
      `Success route URL matched but page body text is near-blank (len=${successTextLen})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
