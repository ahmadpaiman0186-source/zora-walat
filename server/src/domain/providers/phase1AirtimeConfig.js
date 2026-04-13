import { env } from '../../config/env.js';

/** Phase 1 airtime adapter key (`AIRTIME_PROVIDER`). */
export function getPhase1ConfiguredAirtimeProviderId() {
  return String(env.airtimeProvider ?? 'mock').trim().toLowerCase();
}
