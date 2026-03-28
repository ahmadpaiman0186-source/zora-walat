/**
 * DT One (DigitalTown / transferTo) placeholder.
 * Mirror the interface in ../services/reloadly.js when adding a second provider:
 * export async function sendTopupDtOne({ operatorId, amountUsd, msisdn, reference }) { ... }
 *
 * Route selection can live in ../services/fulfillment.js (env PROVIDER=reloadly|dtone).
 */

export const DTONE_NOT_CONFIGURED = true;
