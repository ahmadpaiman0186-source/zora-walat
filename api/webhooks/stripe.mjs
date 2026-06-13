/**
 * Root Vercel deployment bridge for Stripe webhooks.
 *
 * The staging Vercel project currently builds from repo root (`./`), so the
 * server-only `server/api/index.mjs` function is not exposed. This bridge keeps
 * `/webhooks/stripe` on the root deployment while delegating signature
 * verification and money-path handling to the existing slim server handler.
 */

let cachedExpressHandler = null;

function webhookUrlFrom(req) {
  const raw = typeof req?.url === 'string' ? req.url : '';
  const q = raw.indexOf('?');
  return q === -1 ? '/webhooks/stripe' : `/webhooks/stripe${raw.slice(q)}`;
}

async function getExpressHandler() {
  if (!cachedExpressHandler) {
    await import('../../server/bootstrap.js');
    const [{ createValidatedApp }, { default: serverless }] = await Promise.all([
      import('../../server/src/index.js'),
      import('serverless-http'),
    ]);
    cachedExpressHandler = serverless(createValidatedApp(), {
      callbackWaitsForEmptyEventLoop: false,
    });
  }
  return cachedExpressHandler;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, code: 'method_not_allowed' });
    return;
  }

  const originalUrl = req.url;
  req.url = webhookUrlFrom(req);
  try {
    const { handleSlimStripeWebhookPost } = await import(
      '../../server/handlers/slimStripeWebhookHandler.mjs'
    );
    await handleSlimStripeWebhookPost(req, res, getExpressHandler);
  } finally {
    req.url = originalUrl;
  }
}
