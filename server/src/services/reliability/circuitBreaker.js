/** @typedef {'CLOSED' | 'OPEN' | 'HALF_OPEN'} CircuitState */

/**
 * In-memory circuit breaker (per process). Extend with Redis-backed store later for multi-instance.
 */
export class CircuitBreaker {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {number} opts.failureThreshold
   * @param {number} opts.windowMs
   * @param {number} opts.cooldownMs — OPEN duration before probing HALF_OPEN
   * @param {number} [opts.halfOpenMaxCalls]
   */
  constructor(opts) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold;
    this.windowMs = opts.windowMs;
    this.cooldownMs = opts.cooldownMs;
    this.halfOpenMaxCalls = opts.halfOpenMaxCalls ?? 1;

    /** @type {CircuitState} */
    this.state = 'CLOSED';
    /** @type {number[]} */
    this.failuresAt = [];
    this.openedAt = 0;
    this.halfOpenCalls = 0;

    this.metrics = {
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalRejected: 0,
      stateChanges: /** @type {Array<{ at: string, from: CircuitState, to: CircuitState }>} */ ([]),
    };
  }

  /**
   * @returns {CircuitState}
   */
  getState() {
    return this.state;
  }

  /**
   * @param {CircuitState} next
   */
  _transition(next) {
    const from = this.state;
    this.metrics.stateChanges.push({ at: new Date().toISOString(), from, to: next });
    this.state = next;
  }

  /**
   * Whether one execution may proceed (respects OPEN cooldown → HALF_OPEN probe budget).
   * @returns {boolean}
   */
  allowRequest() {
    const now = Date.now();
    this.metrics.totalCalls += 1;

    if (this.state === 'OPEN') {
      if (now >= this.openedAt + this.cooldownMs) {
        this._transition('HALF_OPEN');
        this.halfOpenCalls = 0;
      } else {
        this.metrics.totalRejected += 1;
        return false;
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.metrics.totalRejected += 1;
        return false;
      }
      this.halfOpenCalls += 1;
    }

    return true;
  }

  recordSuccess() {
    this.metrics.totalSuccesses += 1;
    this.failuresAt = [];
    if (this.state === 'HALF_OPEN' || this.state === 'OPEN') {
      this._transition('CLOSED');
    }
    this.openedAt = 0;
  }

  recordFailure() {
    this.metrics.totalFailures += 1;
    const now = Date.now();
    this.failuresAt.push(now);
    this.failuresAt = this.failuresAt.filter((t) => now - t <= this.windowMs);

    if (this.state === 'HALF_OPEN') {
      this.openedAt = now;
      this._transition('OPEN');
      return;
    }

    if (this.failuresAt.length >= this.failureThreshold) {
      this.openedAt = now;
      this._transition('OPEN');
    }
  }

  /**
   * Snapshot for /ready and watchdog.
   */
  getSnapshot() {
    const now = Date.now();
    const openUntil =
      this.state === 'OPEN' ? new Date(this.openedAt + this.cooldownMs).toISOString() : null;
    return {
      name: this.name,
      state: this.state,
      open: this.state === 'OPEN' && now < this.openedAt + this.cooldownMs,
      openUntil: this.state === 'OPEN' ? openUntil : null,
      recentFailures: this.failuresAt.length,
      metrics: { ...this.metrics },
    };
  }

  /** Test / emergency — force isolation */
  forceOpen() {
    this.openedAt = Date.now();
    this._transition('OPEN');
  }
}

/** @type {Map<string, CircuitBreaker>} */
const shared = new Map();

/**
 * @param {string} name
 * @param {ConstructorParameters<typeof CircuitBreaker>[0]} opts
 */
export function getSharedCircuitBreaker(name, opts) {
  const key = String(name ?? 'default').toLowerCase();
  let c = shared.get(key);
  if (!c) {
    c = new CircuitBreaker({ ...opts, name: key });
    shared.set(key, c);
  }
  return c;
}

export function resetSharedCircuitBreakersForTests() {
  shared.clear();
}

/**
 * Snapshots of every named breaker touched in-process (for health + watchdog).
 */
export function getAllSharedCircuitSnapshots() {
  /** @type {Record<string, ReturnType<CircuitBreaker['getSnapshot']>>} */
  const out = {};
  for (const [k, v] of shared.entries()) {
    out[k] = v.getSnapshot();
  }
  return out;
}
