/**
 * Root Vercel deployment bridge for GET /ops/health.
 *
 * Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.
 * This bridge delegates to the existing Express ops router mounted at `/ops`.
 */

let cachedExpressHandler = null;

function opsHealthUrlFrom(req) {
  const raw = typeof req?.url === 'string' ? req.url : '';
  const q = raw.indexOf('?');
  return q === -1 ? '/ops/health' : `/ops/health${raw.slice(q)}`;
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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, code: 'method_not_allowed' });
    return;
  }

  const originalUrl = req.url;
  req.url = opsHealthUrlFrom(req);
  try {
    const expressHandler = await getExpressHandler();
    await expressHandler(req, res);
  } finally {
    req.url = originalUrl;
  }
}
