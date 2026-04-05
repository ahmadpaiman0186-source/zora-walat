/**
 * Require a human operator reason for risky fulfillment mutations (audit + accountability).
 */
export function requireFulfillmentActionReason(req, res, next) {
  const reason = req.body?.reason;
  if (typeof reason !== 'string' || reason.trim().length < 8) {
    return res.status(400).json({
      error:
        'reason is required in JSON body (minimum 8 characters) for dispatch and retry',
      code: 'reason_required',
    });
  }
  req.fulfillmentActionReason = reason.trim().slice(0, 2000);
  next();
}
