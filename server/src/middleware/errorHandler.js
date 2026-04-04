import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';

/** express-rate-limit throws this name when validations fail (e.g. undefined req.ip). */
function isRateLimitValidationError(err) {
  return Boolean(err && err.name === 'ValidationError' && String(err.code ?? '').startsWith('ERR_ERL_'));
}

function isStripeError(err) {
  return Boolean(err && typeof err.type === 'string' && err.type.startsWith('Stripe'));
}

/**
 * Central error handler (must be last `use` before listen).
 */
function isJsonBodyParseError(err) {
  return (
    err?.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && err.status === 400 && 'body' in err)
  );
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (isJsonBodyParseError(err)) {
    req.log?.warn(
      {
        securityEvent: 'json_body_parse_failed',
        ...(env.nodeEnv !== 'production' && !env.prelaunchLockdown
          ? { parseHint: err.message }
          : {}),
      },
      'security',
    );
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (err instanceof ZodError) {
    if (env.nodeEnv === 'production') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    return res.status(400).json({
      error: 'Invalid request body',
      details: err.flatten(),
    });
  }

  if (isRateLimitValidationError(err)) {
    req.log?.error?.(
      { rateLimitValidation: err.code, message: err.message },
      'express-rate-limit validation',
    );
    if (env.nodeEnv !== 'production') {
      console.error('[errorHandler] rate-limit validation:', err.code, err.message);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (isStripeError(err)) {
    const status = typeof err.statusCode === 'number' ? err.statusCode : 400;
    req.log?.warn(
      { stripeType: err.type, code: err.code, message: err.message },
      'stripe error',
    );
    if (env.nodeEnv === 'production') {
      return res.status(status).json({ error: 'Payment provider error' });
    }
    return res.status(status).json({
      error: err.message || 'Payment provider error',
      code: err.code ?? undefined,
    });
  }

  const msg = err?.message || String(err);
  if (env.prelaunchLockdown) {
    req.log?.error?.({ securityEvent: 'unhandled_error' }, 'unhandled error');
  } else {
    req.log?.error?.({ err: { message: msg } }, 'unhandled error');
  }
  /** Local debugging: log safe summary (no stack by default — avoids noisy dumps). */
  if (env.nodeEnv !== 'production') {
    console.error('[errorHandler] unhandled:', err?.name, String(msg).slice(0, 500));
  }
  return res.status(500).json({ error: 'Internal server error' });
}
