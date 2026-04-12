/**
 * Vercel serverless entry: Express app without `listen()`.
 * Do not import `../src/index.js` here (that starts TCP + embedded worker).
 */
import { sendLivenessJsonOk } from '../src/lib/sendLivenessJsonOk.js';

let cachedHandler = null;

function notifyServerlessHealthTest(event) {
  globalThis.__zwServerlessHealthTestHook?.(event);
}

async function getHandler() {
  if (!cachedHandler) {
    notifyServerlessHealthTest('bootstrap_import');
    await import('../bootstrap.js');
    notifyServerlessHealthTest('app_graph_import');
    const [{ createApp }, { default: serverless }] = await Promise.all([
      import('../src/app.js'),
      import('serverless-http'),
    ]);
    const app = createApp();
    cachedHandler = serverless(app, {
      /**
       * Prisma / Redis clients keep sockets open. In serverless we want the response to flush
       * without waiting for the event loop to empty.
       */
      callbackWaitsForEmptyEventLoop: false,
    });
  }
  return cachedHandler;
}

export default function handler(req, res) {
  /**
   * Keep liveness probes independent from the wider app import graph so `/health`
   * stays cheap and deterministic even when optional integrations are slow.
   */
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    sendLivenessJsonOk(res);
    return;
  }
  return getHandler().then((nextHandler) => nextHandler(req, res));
}
