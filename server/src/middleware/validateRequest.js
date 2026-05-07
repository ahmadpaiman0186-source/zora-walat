/**
 * Fail-closed JSON body validation for selected routes.
 * On success, attaches sanitized payload to `req.validated`; handlers must not read `req.body` for those routes.
 */

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {(data: unknown) => unknown} [postParse] optional transform after successful parse (e.g. strip non–checkout-session keys)
 * @returns {import('express').RequestHandler}
 */
export function validateRequest(schema, postParse) {
  return (req, res, next) => {
    const raw = req.body;
    if (raw == null || typeof raw !== 'object' || Buffer.isBuffer(raw)) {
      return res.status(400).json({
        error: 'invalid_request',
        code: 'EDGE_VALIDATION_FAILED',
        details: [{ path: [], message: 'JSON object body required' }],
      });
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
        code: i.code,
      }));
      return res.status(400).json({
        error: 'invalid_request',
        code: 'EDGE_VALIDATION_FAILED',
        details,
      });
    }

    let out = /** @type {unknown} */ (parsed.data);
    if (typeof postParse === 'function') {
      out = postParse(out);
    }
    req.validated = out;
    next();
  };
}
