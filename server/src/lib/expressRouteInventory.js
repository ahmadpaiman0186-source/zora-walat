/**
 * Introspect Express application/router stacks (Express 5 uses `app.router.stack`;
 * older docs refer to `app._router.stack`).
 */

/**
 * @param {import('express').Express | import('express').Router} thing
 * @param {string} base
 * @returns {string[]}
 */
export function collectRouteLines(thing, base = '') {
  const stack = thing.router?.stack ?? thing.stack;
  if (!stack) return [];
  /** @type {string[]} */
  const out = [];
  for (const layer of stack) {
    if (layer.route && layer.route.path) {
      const path = base + layer.route.path;
      const methods = layer.route.methods ?? {};
      for (const m of Object.keys(methods)) {
        if (methods[m]) out.push(`${m.toUpperCase().padEnd(7)} ${path}`);
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const mount =
        typeof layer.path === 'string'
          ? layer.path === '/'
            ? ''
            : layer.path
          : '';
      out.push(...collectRouteLines(layer.handle, base + mount));
    } else if (layer.handle?.stack) {
      out.push(...collectRouteLines(layer.handle, base));
    }
  }
  return out;
}

/**
 * Logs proof that pricing-quote routes are registered (startup diagnostic).
 * @param {import('express').Express} app
 */
export function logCheckoutPricingQuoteRouteProof(app) {
  const legacy = app._router?.stack;
  const current = app.router?.stack;
  console.log(
    `[http] express router stacks: app._router.stack=${legacy?.length ?? 'n/a'} app.router.stack=${current?.length ?? 'n/a'}`,
  );
  const lines = collectRouteLines(app).filter((l) => l.includes('checkout-pricing-quote'));
  console.log(
    `[http] POST checkout-pricing-quote registrations (${lines.length}):`,
  );
  for (const line of lines) {
    console.log(`[http]   ${line}`);
  }
}
