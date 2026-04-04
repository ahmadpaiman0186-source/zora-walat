/**
 * Recharge/data provider boundary — swap mock for Reloadly/DT One-style adapters later.
 * Fulfillment after payment should eventually enqueue work (out of scope for this module).
 *
 * @typedef {import('@prisma/client').Recipient} RecipientRow
 */

/**
 * @typedef {object} QuoteResult
 * @property {string} phone
 * @property {string} operator
 * @property {object[]} packages
 */

/**
 * @typedef {object} OrderResult
 * @property {boolean} success
 * @property {string} orderId
 * @property {string} userId
 * @property {string} recipientId
 * @property {string} phoneE164
 * @property {string} operator
 * @property {string} packageId
 * @property {string} status
 * @property {string} message
 */
