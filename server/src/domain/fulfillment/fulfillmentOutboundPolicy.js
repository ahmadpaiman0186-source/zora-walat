/**
 * Phase 1 outbound airtime (Reloadly HTTP) must be **explicitly** enabled in non-test
 * environments. Mock airtime never uses this gate.
 *
 * @param {string | undefined} nodeEnv
 * @param {{ phase1FulfillmentOutboundEnabled?: boolean }} envSlice
 * @returns {boolean} true when Reloadly I/O must be blocked before any network call
 */
export function shouldBlockPhase1ReloadlyOutbound(nodeEnv, envSlice = {}) {
  if (envSlice.phase1FulfillmentOutboundEnabled === true) {
    return false;
  }
  if (nodeEnv === 'test') {
    return false;
  }
  return true;
}
