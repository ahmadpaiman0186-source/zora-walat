/**
 * Staging operator harness CLI safety — mode validation and copy/paste footgun detection.
 * No secrets in output.
 */

export const OPERATOR_MODES = Object.freeze([
  'register',
  'login',
  'request-otp',
  'verify-otp',
  'checkout',
  'checkout-open-test',
  'status-check',
  'auth-env-check',
  'auth-check',
  'phase1-truth-check',
  'l11-preflight',
]);

export const OPERATOR_MODES_SET = new Set(OPERATOR_MODES);

/** Shell tokens accidentally glued after a valid mode (PowerShell / cmd). */
const GLUE_AFTER_MODE_RE =
  /^(node|set-content|npm|npx|pnpm|yarn|&&|;|\$env:|\.\\|\.\/)/i;

const HARNESS_REL = 'tools/staging-auth-checkout-operator.mjs';

/**
 * @param {string} rawArgv2
 * @returns {null | { kind: 'concatenation', baseMode: string, glued: string }}
 */
export function detectCommandConcatenation(rawArgv2) {
  const raw = String(rawArgv2 ?? '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (OPERATOR_MODES_SET.has(lower)) return null;

  for (const mode of OPERATOR_MODES) {
    if (!lower.startsWith(mode) || lower.length <= mode.length) continue;
    const glued = raw.slice(mode.length);
    if (GLUE_AFTER_MODE_RE.test(glued) || /^[A-Za-z_$]/.test(glued)) {
      return { kind: 'concatenation', baseMode: mode, glued };
    }
  }

  const nodeGlue = lower.match(/^([a-z0-9-]+)node$/);
  if (nodeGlue && OPERATOR_MODES_SET.has(nodeGlue[1])) {
    return { kind: 'concatenation', baseMode: nodeGlue[1], glued: 'node' };
  }

  return null;
}

/**
 * @param {string} [mode]
 */
export function safeOperatorCommandLine(mode = 'l11-preflight') {
  return `node ${HARNESS_REL} ${mode}`;
}

/**
 * Single-line PowerShell examples (run from `server/` directory).
 */
export function powershellSafeOneLiners() {
  return [
    'POWERSHELL_SAFE_ONELINE cd .\\server; node tools\\staging-auth-checkout-operator.mjs l11-preflight',
    'POWERSHELL_SAFE_ONELINE cd .\\server; node tools\\staging-auth-checkout-operator.mjs login',
    'POWERSHELL_SAFE_ONELINE cd .\\server; node tools\\staging-auth-checkout-operator.mjs phase1-truth-check',
    'POWERSHELL_SAFE_ONELINE cd .\\server; $env:STAGING_OPERATOR_EMAIL="you@example.com"; $env:STAGING_OPERATOR_PASSWORD="YourStagingPassword"; node tools\\staging-auth-checkout-operator.mjs l11-preflight',
  ];
}

/**
 * @param {string[]} argv process.argv
 * @returns {{
 *   ok: true,
 *   mode: string,
 * } | {
 *   ok: false,
 *   error: string,
 *   baseMode?: string,
 *   glued?: string,
 *   nextSafeCommand: string,
 * }}
 */
export function parseOperatorCliArgv(argv) {
  const raw = String(argv[2] ?? '').trim();
  const nextSafeCommand = safeOperatorCommandLine('l11-preflight');

  if (!raw) {
    return {
      ok: false,
      error: 'missing_mode',
      nextSafeCommand,
    };
  }

  const concat = detectCommandConcatenation(raw);
  if (concat) {
    return {
      ok: false,
      error: 'command_concatenation_detected',
      baseMode: concat.baseMode,
      glued: concat.glued,
      nextSafeCommand: safeOperatorCommandLine(concat.baseMode),
    };
  }

  const mode = raw.toLowerCase();
  if (!OPERATOR_MODES_SET.has(mode)) {
    return {
      ok: false,
      error: 'unknown_mode',
      nextSafeCommand,
    };
  }

  return { ok: true, mode };
}

export function operatorUsageLines() {
  return [
    `Usage: node ${HARNESS_REL} <${OPERATOR_MODES.join('|')}>`,
    'Run each command on its own line. Do not paste commands together without a separator.',
  ];
}
