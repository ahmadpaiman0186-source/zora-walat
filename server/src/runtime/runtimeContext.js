/**
 * Process-wide runtime kind for API vs worker vs serverless. Set via
 * `registerApiRuntime` / `registerWorkerRuntime` / `registerServerlessRuntime`
 * before importing bootstrap / `serverLifecycle`.
 */
export const RUNTIME_KIND = Object.freeze({
  API: 'api',
  WORKER: 'worker',
  SERVERLESS: 'serverless',
  /** No `ZW_RUNTIME_KIND` (or invalid value). */
  UNSPECIFIED: '',
});

/**
 * @returns {string} One of {@link RUNTIME_KIND} values.
 */
export function getRuntimeKind() {
  const raw = String(process.env.ZW_RUNTIME_KIND ?? '').trim().toLowerCase();
  if (raw === RUNTIME_KIND.API) return RUNTIME_KIND.API;
  if (raw === RUNTIME_KIND.WORKER) return RUNTIME_KIND.WORKER;
  if (raw === RUNTIME_KIND.SERVERLESS) return RUNTIME_KIND.SERVERLESS;
  return RUNTIME_KIND.UNSPECIFIED;
}

/**
 * Test-only: override runtime kind (empty clears).
 * @param {string} [kind]
 */
export function setRuntimeKind(kind) {
  if (kind == null || kind === RUNTIME_KIND.UNSPECIFIED) {
    delete process.env.ZW_RUNTIME_KIND;
    return;
  }
  process.env.ZW_RUNTIME_KIND = kind;
}

/**
 * Express HTTP app must not be built in the worker process.
 * @param {string} label
 */
export function assertHttpAppConstructionAllowedOrThrow(label) {
  if (getRuntimeKind() === RUNTIME_KIND.WORKER) {
    throw new Error(
      `[runtime] ${label}: HTTP app must not be constructed when ZW_RUNTIME_KIND=worker`,
    );
  }
}

/**
 * Background intervals / queue consumer ownership — worker runtime only.
 * @param {string} label
 */
export function assertWorkerRuntimeOrThrow(label) {
  if (getRuntimeKind() !== RUNTIME_KIND.WORKER) {
    throw new Error(
      `[runtime] ${label} requires ZW_RUNTIME_KIND=worker (background worker entry)`,
    );
  }
}
