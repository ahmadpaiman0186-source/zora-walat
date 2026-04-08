/**
 * Resolve wallet load mode without relying on a single argv shape (Windows / npm quirks).
 * Precedence: explicit argv (--mode= or --mode value) > npm_lifecycle_event (npm run …) > none.
 *
 * @param {string[]} argv — typically process.argv
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ mode: 'replay' | 'apply' | null, source: string }}
 */
export function parseLoadMode(argv, env = process.env) {
  const args = argv.slice(2);

  for (const a of args) {
    if (typeof a !== 'string') continue;
    if (a.startsWith('--mode=')) {
      const v = a.slice('--mode='.length).trim().toLowerCase().replace(/\r$/, '');
      if (v === 'replay' || v === 'apply') {
        return { mode: v, source: 'argv(--mode=)' };
      }
      if (v) {
        return { mode: null, source: `argv(--mode=) invalid:${v}` };
      }
    }
  }

  const ix = args.indexOf('--mode');
  if (ix !== -1 && args[ix + 1]) {
    const v = String(args[ix + 1]).trim().toLowerCase().replace(/\r$/, '');
    if (v === 'replay' || v === 'apply') {
      return { mode: v, source: 'argv(--mode_spaced)' };
    }
    if (v) {
      return { mode: null, source: `argv(--mode_spaced)_invalid:${v}` };
    }
  }

  const ev = String(env.npm_lifecycle_event ?? '').trim();
  if (ev === 'load:wallet:replay') {
    return { mode: 'replay', source: 'npm_lifecycle_event' };
  }
  if (ev === 'load:wallet:apply') {
    return { mode: 'apply', source: 'npm_lifecycle_event' };
  }

  return { mode: null, source: 'none' };
}

/**
 * Apply mode: every logical request must have a distinct idempotency key.
 * @param {string[]} keys
 * @param {number} requestCount
 */
export function assertApplyModeKeys(keys, requestCount) {
  if (keys.length !== requestCount) {
    return {
      ok: false,
      reason: `key_count_mismatch:${keys.length}_vs_${requestCount}`,
    };
  }
  const set = new Set(keys);
  if (set.size !== requestCount) {
    return {
      ok: false,
      reason: `duplicate_idempotency_key_in_apply_mode:unique=${set.size}_expected=${requestCount}`,
    };
  }
  return { ok: true, reason: null };
}

/**
 * Replay mode: all keys must equal sharedKey.
 * @param {string[]} keys
 * @param {string} sharedKey
 * @param {number} requestCount
 */
export function assertReplayModeKeys(keys, sharedKey, requestCount) {
  if (keys.length !== requestCount) {
    return { ok: false, reason: `key_count_mismatch` };
  }
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== sharedKey) {
      return { ok: false, reason: `replay_key_mismatch_at_index_${i}` };
    }
  }
  return { ok: true, reason: null };
}
