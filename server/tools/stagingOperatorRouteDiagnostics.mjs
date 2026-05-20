/**
 * Classify staging HTTP responses for operator harness (no secrets in output).
 */

export const ROUTE_DIAGNOSIS = Object.freeze({
  OK: 'ok',
  ROUTE_MISSING_OR_WRONG_DEPLOYMENT: 'route_missing_or_wrong_deployment',
  INVALID_CREDENTIALS: 'invalid_credentials',
  OWNER_ONLY_OR_FORBIDDEN: 'owner_only_or_forbidden',
  VALIDATION_ERROR: 'validation_error',
  AUTH_REQUIRED: 'auth_required',
  TIMEOUT_COLD_START_OR_BOOTSTRAP: 'timeout_cold_start_or_bootstrap',
  SERVICE_DISABLED: 'service_disabled',
  ROUTE_MISSING_API_HANDLER: 'route_missing_api_handler',
  UNKNOWN: 'unknown',
});

/**
 * @param {string | undefined} contentType
 * @param {string | undefined} text
 */
export function responseLooksLikeNextHtml(contentType, text) {
  const ct = String(contentType ?? '').toLowerCase();
  if (ct.includes('text/html')) return true;
  const body = String(text ?? '').slice(0, 4096).toLowerCase();
  return (
    body.includes('<!doctype html') ||
    body.includes('next-error-h1') ||
    body.includes('__next_f') ||
    body.includes('this page could not be found')
  );
}

/**
 * @param {{
 *   status: number | null,
 *   timedOut?: boolean,
 *   contentType?: string,
 *   text?: string,
 *   json?: unknown,
 *   path?: string,
 *   method?: string,
 * }} input
 */
export function classifyStagingHttpResponse(input) {
  const path = String(input.path ?? '');
  const method = String(input.method ?? 'GET').toUpperCase();

  if (input.timedOut) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.TIMEOUT_COLD_START_OR_BOOTSTRAP,
      apiSurfaceLikely: 'unknown',
    };
  }

  const status = input.status;
  const html = responseLooksLikeNextHtml(input.contentType, input.text);

  if (status === 404 && html) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.ROUTE_MISSING_OR_WRONG_DEPLOYMENT,
      apiSurfaceLikely: 'nextjs_frontend',
    };
  }

  if (status === 404 && !html) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.ROUTE_MISSING_API_HANDLER,
      apiSurfaceLikely: 'unknown',
    };
  }

  if (path.includes('/api/auth/login') && method === 'POST') {
    if (status === 401) {
      return {
        diagnosis: ROUTE_DIAGNOSIS.INVALID_CREDENTIALS,
        apiSurfaceLikely: 'api_serverless',
      };
    }
    if (status === 400 && input.json && typeof input.json === 'object') {
      return {
        diagnosis: ROUTE_DIAGNOSIS.VALIDATION_ERROR,
        apiSurfaceLikely: 'api_serverless',
      };
    }
    if (status === 200) {
      return {
        diagnosis: ROUTE_DIAGNOSIS.OK,
        apiSurfaceLikely: 'api_serverless',
      };
    }
    if (status === 403) {
      return {
        diagnosis: ROUTE_DIAGNOSIS.OWNER_ONLY_OR_FORBIDDEN,
        apiSurfaceLikely: 'api_serverless',
      };
    }
  }

  if (status === 403) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.OWNER_ONLY_OR_FORBIDDEN,
      apiSurfaceLikely: html ? 'nextjs_frontend' : 'api_serverless',
    };
  }

  if (status === 401) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.AUTH_REQUIRED,
      apiSurfaceLikely: html ? 'nextjs_frontend' : 'api_serverless',
    };
  }

  if (
    status === 503 &&
    input.json &&
    typeof input.json === 'object' &&
    ('reason' in /** @type {Record<string, unknown>} */ (input.json))
  ) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.SERVICE_DISABLED,
      apiSurfaceLikely: 'api_serverless',
    };
  }

  if (status != null && status >= 200 && status < 300 && !html) {
    return {
      diagnosis: ROUTE_DIAGNOSIS.OK,
      apiSurfaceLikely: 'api_serverless',
    };
  }

  return {
    diagnosis: ROUTE_DIAGNOSIS.UNKNOWN,
    apiSurfaceLikely: html ? 'nextjs_frontend' : 'unknown',
  };
}

export const STAGING_API_DEPLOY_RECOVERY_HINT = Object.freeze({
  cwd: 'server',
  command: 'cd server; vercel deploy --prod --yes',
  inspect: 'cd server; vercel inspect https://zora-walat-api-staging.vercel.app',
});
