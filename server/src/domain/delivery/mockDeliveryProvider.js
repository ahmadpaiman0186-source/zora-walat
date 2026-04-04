/**
 * MOCK DELIVERY PROVIDER — infrastructure / local testing only.
 * Simulates successful delivery with no external API calls.
 * Delegates to `fulfillMockAirtime`; real providers plug in via `executeAirtimeFulfillment` / env.
 */
export { fulfillMockAirtime as executeMockDelivery } from '../fulfillment/mockAirtimeProvider.js';
