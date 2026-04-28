/**
 * Append-only NDJSON sink for sanitized WebTopup observation payloads.
 * Failures are swallowed so money-path and workers never crash on I/O errors.
 */

import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

import { env } from '../config/env.js';

/** @type {string | null} */
let pathOverrideForTests = null;
/** @type {boolean | null} */
let enabledOverrideForTests = null;
/** @type {number | null} */
let maxBytesOverrideForTests = null;

export function setWebtopDurableLogPathOverrideForTests(p) {
  pathOverrideForTests = p;
}

export function clearWebtopDurableLogPathOverrideForTests() {
  pathOverrideForTests = null;
}

export function setWebtopDurableLogEnabledOverrideForTests(v) {
  enabledOverrideForTests = v;
}

export function clearWebtopDurableLogEnabledOverrideForTests() {
  enabledOverrideForTests = null;
}

export function setWebtopDurableLogMaxBytesOverrideForTests(n) {
  maxBytesOverrideForTests = n;
}

export function clearWebtopDurableLogMaxBytesOverrideForTests() {
  maxBytesOverrideForTests = null;
}

function resolvedPath() {
  return pathOverrideForTests ?? env.webtopupDurableLogPath;
}

function resolvedEnabled() {
  if (enabledOverrideForTests !== null) return enabledOverrideForTests;
  return env.webtopupDurableLogEnabled;
}

function resolvedMaxBytes() {
  return maxBytesOverrideForTests ?? env.webtopupDurableLogMaxBytes;
}

/**
 * Rotate when file exceeds max bytes (best-effort; append-only friendly).
 * @param {string} filePath
 * @param {number} maxBytes
 */
async function maybeRotate(filePath, maxBytes) {
  try {
    const st = await stat(filePath);
    if (st.size < maxBytes) return;
    const rotated = `${filePath}.${Date.now()}.rotated.ndjson`;
    await rename(filePath, rotated);
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
    if (code === 'ENOENT') return;
    throw e;
  }
}

/**
 * @param {Record<string, unknown>} record — already sanitized (same as in-memory buffer)
 */
export async function appendWebtopDurableLogLine(record) {
  if (!resolvedEnabled()) return;
  const filePath = resolvedPath();
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await maybeRotate(filePath, resolvedMaxBytes());
    const line = `${JSON.stringify(record)}\n`;
    await appendFile(filePath, line, 'utf8');
  } catch {
    // intentional: never throw to callers
  }
}

export function getWebtopDurableLogConfigSnapshot() {
  return {
    enabled: resolvedEnabled(),
    path: resolvedEnabled() ? resolvedPath() : null,
    maxBytes: resolvedMaxBytes(),
  };
}
