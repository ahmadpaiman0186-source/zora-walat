/**
 * Root Vercel deployment bridge for GET /ops/db-readonly-proof.
 *
 * Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.
 * This bridge maps the L-85M proof path through the existing L-85P pre-bootstrap
 * guard and Express pass-through used in `server/api/index.mjs`.
 */

let cachedExpressHandler = null;

function opsDbReadonlyProofUrlFrom(req) {
  const raw = typeof req?.url === 'string' ? req.url : '';
  const q = raw.indexOf('?');
  return q === -1 ? '/ops/db-readonly-proof' : `/ops/db-readonly-proof${raw.slice(q)}`;
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
  req.url = opsDbReadonlyProofUrlFrom(req);
  try {
    const { handleSlimDbReadonlyProofPrebootstrapGet } = await import(
      '../../server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs'
    );
    await handleSlimDbReadonlyProofPrebootstrapGet(req, res, {
      route: '/ops/db-readonly-proof',
      passThrough: () => getExpressHandler().then((nextHandler) => nextHandler(req, res)),
    });
  } finally {
    req.url = originalUrl;
  }
}
