/**
 * Root Vercel deployment bridge for GET /ops/db-readonly-proof.
 *
 * Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.
 * This bridge maps the L-85M proof path through the existing L-85P pre-bootstrap
 * guard and Express pass-through used in `server/api/index.mjs`.
 */
import '../../server/src/runtime/registerServerlessRuntime.js';

let cachedExpressHandler = null;

const PROOF_ROUTE = '/ops/db-readonly-proof';

function buildProofRouteBridgeRuntimeExceptionBody(route) {
  return {
    ok: false,
    success: false,
    verdict: 'BLOCKED',
    classification: 'PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION',
    reason: 'proof_route_bridge_runtime_exception',
    route,
    auth_required: true,
    prebootstrap_guard: false,
    proof_route_bridge: true,
    db_query_performed: false,
    row_export_occurred: false,
    write_probe_occurred: false,
    secret_disclosure: false,
    owner_database_url_fallback_used: false,
    runtime_db_identity_proof: false,
    readonly_database_url_proof: false,
  };
}

function sendProofRouteBridgeRuntimeException(res, route = PROOF_ROUTE) {
  if (res.headersSent) return;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(503).json(buildProofRouteBridgeRuntimeExceptionBody(route));
}

async function runAuthenticatedPassThrough(req, res) {
  if (typeof globalThis.__zwProofBridgePassThroughImplForTest === 'function') {
    await globalThis.__zwProofBridgePassThroughImplForTest(req, res);
    return;
  }
  const nextHandler = await getExpressHandler();
  await nextHandler(req, res);
}

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
      route: PROOF_ROUTE,
      passThrough: async () => {
        try {
          await runAuthenticatedPassThrough(req, res);
        } catch {
          sendProofRouteBridgeRuntimeException(res);
        }
      },
    });
  } finally {
    req.url = originalUrl;
  }
}
