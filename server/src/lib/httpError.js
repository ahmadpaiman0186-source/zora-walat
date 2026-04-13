/** Controlled HTTP errors — `message` is safe to send to clients (no stack, no secrets). */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} message Client-safe message
   * @param {{ code?: string, operationalClass?: string }} [opts]
   */
  constructor(status, message, opts = {}) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
    if (opts && typeof opts === 'object') {
      if (opts.code != null) this.code = opts.code;
      if (opts.operationalClass != null) this.operationalClass = opts.operationalClass;
    }
  }
}
