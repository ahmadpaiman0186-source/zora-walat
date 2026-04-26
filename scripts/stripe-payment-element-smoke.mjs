/**
 * Smoke: open marketing top-up, complete "continue" with defaults + test phone,
 * wait for a Stripe-hosted iframe (Payment Element). Requires:
 * - `npm run dev` on :3000
 * - `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`
 * - Backend answering `NEXT_PUBLIC_API_URL`
 */
import { chromium } from 'playwright';

const base = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.waitForSelector('#operator', { timeout: 30000 });
  const optCount = await page.locator('#operator option').count();
  if (optCount < 2) {
    throw new Error('No operator options — catalog/API may be broken.');
  }
  const firstVal = await page.locator('#operator option').nth(1).getAttribute('value');
  await page.selectOption('#operator', firstVal);
  const formCard = page.locator('article').filter({ has: page.locator('#form-title') });
  // After operator is chosen, amount chips mount as the second role=group (product type is first).
  await page.waitForFunction(
    () => {
      const art = [...document.querySelectorAll('article')].find((a) =>
        a.querySelector('#form-title'),
      );
      return art && art.querySelectorAll('[role="group"]').length >= 2;
    },
    null,
    { timeout: 30000 },
  );
  const amountChipRow = formCard.locator('[role="group"]').nth(1);
  await amountChipRow.waitFor({ state: 'visible', timeout: 30000 });
  await amountChipRow.locator('button[type="button"]').first().click();
  // National digits only; dial code is shown separately (+93 for default AF).
  await page.fill('#phone', '701234567');

  const cta = page.getByRole('button', { name: /continue|secure|payment|متابعة/i });
  await cta.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(
    () => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        /continue|secure|payment|متابعة/i.test(x.textContent ?? ''),
      );
      return b && !b.disabled;
    },
    null,
    { timeout: 30000 },
  );
  await cta.click({ timeout: 60000 });

  await page.waitForFunction(
    () => document.querySelectorAll('iframe').length > 0,
    null,
    { timeout: 120000 },
  );

  const srcs = await page.evaluate(() =>
    [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src') ?? ''),
  );
  const stripeIframe = srcs.some(
    (s) => s.includes('stripe.com') || s.includes('js.stripe.com'),
  );
  if (!stripeIframe) {
    throw new Error(`No Stripe iframe src among: ${JSON.stringify(srcs)}`);
  }

  await browser.close();
  if (consoleErrors.length) {
    console.warn('Browser console errors:', consoleErrors);
  }
  console.log('PASS: Stripe Payment Element iframe present.');
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
