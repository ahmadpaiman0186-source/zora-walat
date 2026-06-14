/**
 * Root Vercel deployment bridge for health/readiness probes.
 *
 * Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.
 * This bridge mirrors the slim liveness/readiness handlers used there without
 * loading Express, bootstrap, or payment paths. Rewrites in root `vercel.json`
 * map `/health`, `/ready`, `/api/health`, and `/api/ready` here with `?route=`.
 */

function requestQuery(url) {
  if (typeof url !== 'string') return new URLSearchParams();
  const q = url.indexOf('?');
  if (q === -1) return new URLSearchParams();
  return new URLSearchParams(url.slice(q + 1));
}

function probeRouteFrom(req) {
  const route = requestQuery(req?.url).get('route');
  if (route === 'health' || route === 'ready') return route;
  return null;
}

function methodNotAllowed(res, allow) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', allow);
  res.status(405).json({ success: false, code: 'method_not_allowed' });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const route = probeRouteFrom(req);
  if (!route) {
    res.status(404).json({ success: false, code: 'not_found' });
    return;
  }

  if (route === 'health') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      methodNotAllowed(res, 'GET, HEAD');
      return;
    }
    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }
    const { sendLivenessJsonOk } = await import('../server/src/lib/sendLivenessJsonOk.js');
    sendLivenessJsonOk(res);
    return;
  }

  if (route === 'ready') {
    if (req.method !== 'GET') {
      methodNotAllowed(res, 'GET');
      return;
    }
    const { handleSlimReady } = await import('../server/handlers/slimReadyHandler.mjs');
    await handleSlimReady(res);
  }
}
