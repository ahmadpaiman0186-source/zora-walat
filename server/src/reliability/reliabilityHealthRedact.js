/**
 * Strip secret/PII-like keys from objects destined for admin reliability JSON.
 */

const SENSITIVE_KEY =
  /^(?:.*(_)?(password|secret|token|authorization|bearer|apikey|api_key|stripe|webhook|cookie).*)$/i;
const PII_KEY =
  /^(?:.*(email|phone|e164|recipient|national|address|name|useremail).*)$/i;

/**
 * @param {unknown} input
 * @param {number} depth
 * @returns {unknown}
 */
export function redactForReliabilityReport(input, depth = 0) {
  if (depth > 6) return '[depth_limit]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    if (input.length > 200) return `${input.slice(0, 12)}…[redacted_len=${input.length}]`;
    return input;
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.slice(0, 32).map((x) => redactForReliabilityReport(x, depth + 1));
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEY.test(k) || PII_KEY.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = redactForReliabilityReport(v, depth + 1);
  }
  return out;
}
