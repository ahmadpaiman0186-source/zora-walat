/**
 * Root Vercel deployment bridge for POST /api/create-checkout-session.
 *
 * Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.
 * This bridge mirrors the slim checkout routing there: Bearer → slim handler;
 * missing Bearer without dev probe → 401; dev `X-ZW-Dev-Checkout` → Express fallback.
 * Payment business logic is unchanged — route reachability only.
 */

let cachedExpressHandler = null;

async function getExpressHandler() {
  if (!cachedExpressHandler) {
    await import('../server/bootstrap.js');
    const [{ createValidatedApp }, { default: serverless }] = await Promise.all([
      import('../server/src/index.js'),
      import('serverless-http'),
    ]);
    cachedExpressHandler = serverless(createValidatedApp(), {
      callbackWaitsForEmptyEventLoop: false,
    });
  }
  return cachedExpressHandler;
}

function checkoutUrlFrom(req) {
  const raw = typeof req?.url === 'string' ? req.url : '';
  const q = raw.indexOf('?');
  const base = '/api/create-checkout-session';
  return q === -1 ? base : `${base}${raw.slice(q)}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, code: 'method_not_allowed' });
    return;
  }

  const authz = req.headers?.authorization;
  const hasBearer =
    typeof authz === 'string' &&
    authz.startsWith('Bearer ') &&
    authz.slice(7).trim().length > 0;

  if (hasBearer) {
    const originalUrl = req.url;
    req.url = checkoutUrlFrom(req);
    try {
      const { handleSlimCreateCheckoutPost } = await import(
        '../server/handlers/slimCreateCheckoutHandler.mjs'
      );
      await handleSlimCreateCheckoutPost(req, res);
    } finally {
      req.url = originalUrl;
    }
    return;
  }

  const { clientErrorBody } = await import('../server/src/lib/clientErrorJson.js');
  const devHdr = req.headers?.['x-zw-dev-checkout'];
  const devProbe =
    typeof devHdr === 'string' && String(devHdr).trim().length >= 16;
  if (!devProbe) {
    res.status(401).json(
      clientErrorBody('Authentication required', 'auth_required'),
    );
    return;
  }

  const originalUrl = req.url;
  req.url = checkoutUrlFrom(req);
  try {
    const expressHandler = await getExpressHandler();
    await expressHandler(req, res);
  } finally {
    req.url = originalUrl;
  }
}
