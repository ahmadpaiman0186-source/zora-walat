/**
 * Reject non-JSON bodies for strict API semantics (415 Unsupported Media Type).
 */
export function requireJsonContentType(req, res, next) {
  const ct = req.headers['content-type'];
  if (!ct || !String(ct).toLowerCase().includes('application/json')) {
    req.log?.warn(
      { securityEvent: 'invalid_content_type', path: req.path },
      'security',
    );
    return res.status(415).json({
      error: 'Content-Type must be application/json',
    });
  }
  next();
}
