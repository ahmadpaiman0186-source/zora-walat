/**
 * Light anti-automation signal for money-adjacent JSON routes (browser Sec-Fetch-* or explicit app header).
 * Flutter / mobile: send `X-ZW-Client: zw-flutter/1` (or any `zw-*` prefix). Browsers send Sec-Fetch-* automatically.
 */

import { env } from '../config/env.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';

/**
 * @type {import('express').RequestHandler}
 */
export function requireBasicClientIntegrity(req, res, next) {
  if (!env.antiBotStrictHeaders) {
    return next();
  }
  if (req.method === 'OPTIONS' || req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  const ua = String(req.get('user-agent') ?? '').trim();
  if (ua.length < 8) {
    return res
      .status(400)
      .json(
        clientErrorBody(
          'A valid User-Agent is required.',
          API_CONTRACT_CODE.VALIDATION_ERROR,
        ),
      );
  }

  const secSite = String(req.get('sec-fetch-site') ?? '').trim().toLowerCase();
  const secMode = String(req.get('sec-fetch-mode') ?? '').trim().toLowerCase();
  const zwClient = String(req.get('x-zw-client') ?? '').trim().toLowerCase();

  const browserLike =
    (secSite && ['same-origin', 'same-site', 'cross-site'].includes(secSite)) ||
    (secMode && ['cors', 'navigate', 'same-origin'].includes(secMode));
  const trustedApp = zwClient.startsWith('zw-');

  if (browserLike || trustedApp) {
    return next();
  }

  return res.status(400).json(
    clientErrorBody(
      'Client integrity check failed. For web, use a modern browser; for apps send header X-ZW-Client: zw-flutter/1.',
      'client_integrity_required',
    ),
  );
}
