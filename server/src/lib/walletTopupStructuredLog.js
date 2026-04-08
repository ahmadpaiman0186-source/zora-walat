/**
 * One-line JSON logs for wallet top-up observability (log aggregators).
 * @param {Record<string, unknown>} payload
 */
export function logWalletTopupEvent(payload) {
  console.log(
    JSON.stringify({
      event: 'wallet_topup',
      t: new Date().toISOString(),
      ...payload,
    }),
  );
}
