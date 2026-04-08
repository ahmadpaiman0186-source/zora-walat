/**
 * Inquiry-before-retry: resolve provider truth for a prior Reloadly dispatch key without POST /topups.
 * Uses GET /reports/transactions (paginated) and matches `customIdentifier`.
 */
import { env } from '../config/env.js';
import { getReloadlyAccessTokenCached } from './reloadlyAuthService.js';

const ACCEPT = 'application/com.reloadly.topups-v1+json';

/**
 * @param { unknown } row
 * @param {string} want
 * @returns {boolean}
 */
function rowMatchesCustomIdentifier(row, want) {
  if (!row || typeof row !== 'object') return false;
  const ci = row.customIdentifier;
  if (ci == null) return false;
  return String(ci).trim() === want;
}

/**
 * @param {string} statusRaw
 * @returns {'confirmed' | 'pending' | 'terminal_failure' | 'unknown'}
 */
export function classifyReloadlyReportRowStatus(statusRaw) {
  const s = String(statusRaw ?? '').trim().toUpperCase();
  if (s === 'SUCCESSFUL' || s === 'COMPLETED' || s === 'DELIVERED') {
    return 'confirmed';
  }
  if (s === 'FAILED' || s === 'REFUNDED' || s === 'CANCELLED' || s === 'REVERSED') {
    return 'terminal_failure';
  }
  if (
    s === 'PENDING' ||
    s === 'PROCESSING' ||
    s === 'IN_PROGRESS' ||
    s === 'SUBMITTED'
  ) {
    return 'pending';
  }
  if (s === '') return 'unknown';
  return 'unknown';
}

/**
 * @param {string} customIdentifier
 * @returns {Promise<
 *   | { found: false, reason: string, pagesScanned?: number }
 *   | {
 *       found: true,
 *       classification: 'confirmed' | 'pending' | 'terminal_failure' | 'unknown',
 *       providerStatus: string,
 *       transactionId: string | number | null,
 *       row: Record<string, unknown>,
 *       pagesScanned: number,
 *     }
 * >}
 */
export async function findReloadlyTopupReportRowByCustomIdentifier(customIdentifier) {
  const key = String(customIdentifier ?? '').trim();
  if (!key) {
    return { found: false, reason: 'missing_custom_identifier' };
  }
  if (env.reloadlyInquiryBeforeRetryDisabled) {
    return { found: false, reason: 'inquiry_disabled' };
  }

  const tokenResult = await getReloadlyAccessTokenCached();
  if (!tokenResult.ok) {
    return { found: false, reason: 'auth_failed' };
  }

  const base = env.reloadlyBaseUrl.replace(/\/$/, '');
  const timeoutMs = Math.min(env.airtimeProviderTimeoutMs, 25_000);
  const maxPages = env.reloadlyTransactionInquiryMaxPages;
  let pagesScanned = 0;

  /**
   * @param {number} page
   * @param {string | null} filterCustomId
   */
  async function fetchPage(page, filterCustomId) {
    const params = new URLSearchParams();
    params.set('size', '50');
    params.set('page', String(page));
    if (filterCustomId) {
      params.set('customIdentifier', filterCustomId);
    }
    const url = `${base}/reports/transactions?${params.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: ACCEPT,
          Authorization: `Bearer ${tokenResult.accessToken}`,
        },
        signal: controller.signal,
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      const list = Array.isArray(json)
        ? json
        : json && typeof json === 'object'
          ? json.content ?? json.data ?? []
          : [];
      const rows = Array.isArray(list) ? list : [];
      const last =
        (json && typeof json === 'object' && json.last === true) || rows.length < 50;
      return { ok: res.ok, status: res.status, rows, last };
    } catch (e) {
      if (e?.name === 'AbortError') {
        return { ok: false, status: 0, rows: [], last: true, aborted: true };
      }
      return { ok: false, status: 0, rows: [], last: true, error: String(e?.message ?? e) };
    } finally {
      clearTimeout(timer);
    }
  }

  const filtered = await fetchPage(0, key);
  pagesScanned += 1;
  if (filtered.aborted) {
    return { found: false, reason: 'inquiry_timeout', pagesScanned };
  }
  if (filtered.error) {
    return { found: false, reason: `request_error:${filtered.error.slice(0, 80)}`, pagesScanned };
  }
  if (filtered.ok) {
    for (const row of filtered.rows) {
      if (rowMatchesCustomIdentifier(row, key)) {
        return buildHit(row, key, pagesScanned);
      }
    }
  }

  for (let page = 0; page < maxPages; page++) {
    const pack = await fetchPage(page, null);
    pagesScanned += 1;
    if (pack.aborted) {
      return { found: false, reason: 'inquiry_timeout', pagesScanned };
    }
    if (pack.error) {
      return { found: false, reason: `request_error:${pack.error.slice(0, 80)}`, pagesScanned };
    }
    if (!pack.ok) {
      return { found: false, reason: `http_${pack.status}`, pagesScanned };
    }
    for (const row of pack.rows) {
      if (rowMatchesCustomIdentifier(row, key)) {
        return buildHit(row, key, pagesScanned);
      }
    }
    if (pack.last) break;
  }

  return { found: false, reason: 'not_found', pagesScanned };
}

/**
 * @param {object} row
 * @param {string} key
 * @param {number} pagesScanned
 */
function buildHit(row, key, pagesScanned) {
  void key;
  const providerStatus =
    row && typeof row === 'object' && row.status != null ? String(row.status) : '';
  const tid =
    row && typeof row === 'object' && row.transactionId != null ? row.transactionId : null;
  const classification = classifyReloadlyReportRowStatus(providerStatus);
  return {
    found: true,
    classification,
    providerStatus,
    transactionId: tid,
    row: row && typeof row === 'object' ? { ...row } : {},
    pagesScanned,
  };
}
