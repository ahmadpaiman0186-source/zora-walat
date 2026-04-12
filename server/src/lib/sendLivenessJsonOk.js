/**
 * Shared liveness response for public `GET /health` and `GET /api/health`.
 * Same JSON contract on both paths; no I/O (safe for LB health checks).
 * @param {import('express').Response} res
 */
export function sendLivenessJsonOk(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
}
