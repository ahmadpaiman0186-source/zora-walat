/** Paths for pino `redact` — tokens, signatures, replay keys, cookies, auth bodies. */
export const PINO_HTTP_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers["stripe-signature"]',
  'req.headers["idempotency-key"]',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'req.headers["proxy-authorization"]',
  'req.body.password',
  'req.body.refreshToken',
  'req.body.token',
  'req.body.idToken',
];
