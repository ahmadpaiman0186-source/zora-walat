import { listUserOrders, inspectUserOrder } from '../services/transactionsService.js';

export async function listTransactions(req, res) {
  const userId = req.user.id;
  const limit = req.query.limit ?? '20';
  const { orderStatus, paymentStatus, fulfillmentStatus } = req.query;

  const result = await listUserOrders({
    userId,
    limit,
    orderStatus: orderStatus != null ? String(orderStatus) : null,
    paymentStatus: paymentStatus != null ? String(paymentStatus) : null,
    fulfillmentStatus:
      fulfillmentStatus != null ? String(fulfillmentStatus) : null,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ orders: result.orders });
}

export async function getTransaction(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  const result = await inspectUserOrder({ userId, id });
  if (!result.ok) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(result.order);
}

