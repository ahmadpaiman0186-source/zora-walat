/** Controlled HTTP errors — `message` is safe to send to clients (no stack, no secrets). */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} message Client-safe message (same in dev/prod for auth paths)
   */
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
