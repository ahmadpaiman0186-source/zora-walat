import {
  API_CONTRACT_CODE,
  INTERNAL_TOOLING_CODE,
  ORDER_API_ERROR_CODE,
} from '../constants/apiContractCodes.js';
import { clientErrorBody } from './clientErrorJson.js';

/**
 * Infer a stable `code` for staff/admin JSON errors from HTTP status and legacy message text.
 * @param {string} message
 * @param {number} httpStatus
 */
export function inferStaffApiErrorCode(message, httpStatus) {
  const m = String(message ?? '');
  if (httpStatus === 404 || m === 'Not found') {
    return API_CONTRACT_CODE.NOT_FOUND;
  }
  if (m === 'Order not found') {
    return API_CONTRACT_CODE.NOT_FOUND;
  }
  if (m === 'Invalid order id') {
    return ORDER_API_ERROR_CODE.INVALID_ORDER_ID;
  }
  if (m.startsWith('Invalid value')) {
    return API_CONTRACT_CODE.VALIDATION_ERROR;
  }
  if (
    m === 'Missing or invalid id' ||
    m === 'Invalid body' ||
    m === 'Invalid id' ||
    m === 'Invalid since' ||
    m === 'Invalid until'
  ) {
    return API_CONTRACT_CODE.VALIDATION_ERROR;
  }
  if (httpStatus >= 500 || m === 'Internal error') {
    return API_CONTRACT_CODE.INTERNAL_ERROR;
  }
  return INTERNAL_TOOLING_CODE.STAFF_OPERATION_FAILED;
}

/**
 * @param {string} message
 * @param {number} httpStatus
 * @param {Record<string, unknown>} [extra]
 */
export function staffApiErrorBody(message, httpStatus, extra = {}) {
  const code = inferStaffApiErrorCode(message, httpStatus);
  return clientErrorBody(String(message), code, extra);
}

function humanizeSnake(s) {
  return String(s)
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Stable machine code for manual-processing admin failures (service returns snake_case tokens).
 * @param {string} raw
 */
export function processingManualErrorCode(raw) {
  const r = String(raw ?? 'failed');
  if (r === 'Order not found') return API_CONTRACT_CODE.NOT_FOUND;
  if (r === 'reason_too_short') return API_CONTRACT_CODE.VALIDATION_ERROR;
  return `processing_manual_${r}`;
}

/**
 * User-facing message for a manual-processing failure token.
 * @param {string} raw
 */
export function processingManualErrorMessage(raw) {
  const r = String(raw ?? '');
  if (r === 'Order not found') return 'Not found';
  if (r === 'reason_too_short') return 'Reason text is too short.';
  if (r === 'not_manual_required') {
    return 'Order is not in manual-required state for this action.';
  }
  if (r === 'no_processing_attempt') {
    return 'No matching in-flight processing attempt for this operation.';
  }
  if (!r.includes(' ') && r.includes('_')) {
    return `${humanizeSnake(r)}.`;
  }
  return r;
}

/**
 * @param {{ ok: false, status?: number, error?: string, guidance?: string }} out
 */
export function processingManualFailureBody(out) {
  const status = out.status ?? 400;
  const raw = String(out.error ?? 'failed');
  const message = processingManualErrorMessage(raw);
  const code = processingManualErrorCode(raw);
  const extra = {};
  if (out.guidance) extra.guidance = out.guidance;
  return clientErrorBody(message, code, extra);
}
