/**
 * Truthful classification for POST /api/wallet/topup load results (not “all 2xx = good”).
 * @param {number} status
 * @param {unknown} parsed — JSON body or null
 */
export function classifyWalletTopupResult(status, parsed) {
  const code =
    parsed && typeof parsed === 'object' && parsed.code != null
      ? String(parsed.code)
      : null;
  const msgText =
    parsed && typeof parsed === 'object' && parsed.message != null
      ? String(parsed.message)
      : '';
  const errText =
    parsed && typeof parsed === 'object' && parsed.error != null
      ? String(parsed.error)
      : '';
  const text = errText || msgText;

  if (status === 401) {
    return { kind: 'auth_required', status, code };
  }
  if (
    status === 400 &&
    (code === 'wallet_topup_idempotency_required' ||
      text.includes('Idempotency-Key header required'))
  ) {
    return { kind: 'idempotency_required', status, code };
  }
  if (status === 400 && code === 'wallet_topup_idempotency_invalid') {
    return { kind: 'idempotency_invalid', status, code };
  }
  if (
    status === 400 &&
    text.includes('Invalid Idempotency-Key') &&
    !code
  ) {
    return { kind: 'idempotency_invalid', status, code };
  }
  if (status === 409 && code === 'wallet_topup_idempotency_conflict') {
    return { kind: 'idempotency_conflict', status, code };
  }
  if (status === 400 && code === 'wallet_topup_amount_out_of_range') {
    return { kind: 'amount_out_of_range', status, code };
  }
  if (status === 400) {
    return { kind: 'validation_or_business_400', status, code };
  }
  if (status === 403 && code === 'auth_verification_required') {
    return { kind: 'verification_required', status, code };
  }
  if (status === 403) {
    return { kind: 'forbidden', status, code };
  }
  if (status === 415) {
    return { kind: 'unsupported_media_type', status, code };
  }
  if (status === 503) {
    return { kind: 'unavailable_lockdown', status, code };
  }
  if (status === 429 && code === 'wallet_topup_rate_limited') {
    return { kind: 'wallet_topup_rate_limited', status, code };
  }
  if (status === 429 && code === 'wallet_topup_per_minute_limited') {
    return { kind: 'wallet_topup_per_minute_limited', status, code };
  }
  if (status === 429) {
    return { kind: 'rate_limited', status, code };
  }
  if (status >= 200 && status < 300) {
    const replay =
      parsed && typeof parsed === 'object' && parsed.idempotentReplay === true;
    const apply =
      parsed && typeof parsed === 'object' && parsed.idempotentReplay === false;
    if (replay) return { kind: 'replay_ok', status, code };
    if (apply) return { kind: 'apply_ok', status, code };
    /** Legacy path without Idempotency-Key when enforcement off */
    return { kind: 'success_no_replay_flag', status, code };
  }
  return { kind: 'other_error', status, code };
}

/**
 * After a replay-mode run, check invariants (best-effort; OK for operator triage).
 * @param {{ kind: string }[]} classes
 * @param {'replay'} mode
 */
export function replayModeDefects(classes) {
  /** @type {string[]} */
  const defects = [];
  const apply = classes.filter((c) => c.kind === 'apply_ok').length;
  const replay = classes.filter((c) => c.kind === 'replay_ok').length;
  const bad = classes.filter(
    (c) => !['apply_ok', 'replay_ok'].includes(c.kind),
  );
  if (bad.length > 0) {
    defects.push(`non_replay_success_responses:${bad.length}`);
  }
  if (apply === 0) {
    defects.push('expected_at_least_one_apply_ok');
  }
  if (replay === 0 && classes.length > 1) {
    defects.push('expected_replay_ok_for_subsequent_requests');
  }
  if (apply > 1) {
    defects.push(
      `multiple_apply_ok(${apply})_may_indicate_race_or_double_apply_investigate`,
    );
  }
  return defects;
}

/**
 * Apply mode: every successful response should be a first-apply (`apply_ok`), never `replay_ok`.
 * @param {{ kind: string }[]} classes
 */
export function applyModeDefects(classes) {
  /** @type {Record<string, number>} */
  const byKind = {};
  for (const c of classes) {
    byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
  }
  /** @type {string[]} */
  const defects = [];
  const replay = byKind.replay_ok ?? 0;
  if (replay > 0) {
    defects.push(
      `apply_mode_replay_ok_count_${replay} (expected 0 — duplicate Idempotency-Key or wrong mode)`,
    );
  }
  for (const [k, n] of Object.entries(byKind)) {
    if (k === 'apply_ok' || k === 'replay_ok') continue;
    defects.push(`apply_mode_unexpected_${k}_count_${n}`);
  }
  return defects;
}
