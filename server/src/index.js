export {
  createValidatedApp,
  startApiRuntime,
  startBackgroundWorkerRuntime,
  validateServerRuntimeOrExit,
} from './runtime/serverLifecycle.js';
export {
  getRuntimeKind,
  RUNTIME_KIND,
  setRuntimeKind,
  assertWorkerRuntimeOrThrow,
  assertHttpAppConstructionAllowedOrThrow,
} from './runtime/runtimeContext.js';
