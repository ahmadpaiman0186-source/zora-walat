import { ORDER_STATUS } from '../../constants/orderStatus.js';

const TERMINAL = new Set([
  ORDER_STATUS.FULFILLED,
  ORDER_STATUS.FAILED,
  ORDER_STATUS.CANCELLED,
]);

/** Allowed transitions [from -> Set<to>] */
const EDGES = new Map([
  [
    ORDER_STATUS.PENDING,
    new Set([
      ORDER_STATUS.PAID,
      ORDER_STATUS.FAILED,
      ORDER_STATUS.CANCELLED,
    ]),
  ],
  [ORDER_STATUS.PAID, new Set([ORDER_STATUS.PROCESSING, ORDER_STATUS.FAILED])],
  [
    ORDER_STATUS.PROCESSING,
    new Set([ORDER_STATUS.FULFILLED, ORDER_STATUS.FAILED]),
  ],
]);

export class OrderTransitionError extends Error {
  constructor(message, code = 'invalid_transition') {
    super(message);
    this.name = 'OrderTransitionError';
    this.code = code;
  }
}

export function isTerminalOrderStatus(status) {
  return TERMINAL.has(status);
}

export function canTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return false;
  if (TERMINAL.has(fromStatus)) return false;
  const allowed = EDGES.get(fromStatus);
  return Boolean(allowed?.has(toStatus));
}

export function assertTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) {
    throw new OrderTransitionError('Order status unchanged');
  }
  if (!canTransition(fromStatus, toStatus)) {
    throw new OrderTransitionError(
      `Invalid order transition ${fromStatus} -> ${toStatus}`,
      'invalid_transition',
    );
  }
}
