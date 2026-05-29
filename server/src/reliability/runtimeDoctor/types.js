/**
 * CORE-04 detect-only runtime doctor — finding schema (no mutations).
 */

export const DOCTOR_SCHEMA_VERSION = 1;

/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} DoctorSeverity */

/** @typedef {'A' | 'B' | 'C' | 'D'} RepairClass */

/**
 * @typedef {object} DiagnosticFinding
 * @property {string} id — stable finding id (e.g. FM-07-001)
 * @property {string} fmId — failure mode from CORE-03 matrix
 * @property {string[]} invariantIds — INV-01..07
 * @property {DoctorSeverity} severity
 * @property {RepairClass} repairClass
 * @property {string} recommendation — human/action code (never auto-applied)
 * @property {boolean} mutationAllowed — always false in CORE-04 v1
 * @property {string} [entityType] — order | checkout | webhook | attempt | wallet
 * @property {string} [entityId] — redacted-safe id
 * @property {Record<string, unknown>} [evidence] — sanitized fields only
 * @property {string} [confidence] — high | medium | low
 */

/**
 * @typedef {object} ReliabilityScanReport
 * @property {number} schemaVersion
 * @property {string} scanAt — ISO-8601
 * @property {string} mode — detect_only
 * @property {boolean} detectOnly — always true
 * @property {boolean} autoRepairApplyEnabled — always false
 * @property {DiagnosticFinding[]} findings
 * @property {{ critical: number, high: number, medium: number, low: number, info: number }} counts
 * @property {'PASS' | 'WARN' | 'FAIL'} verdict
 */

/**
 * @param {Partial<DiagnosticFinding> & Pick<DiagnosticFinding, 'id' | 'fmId' | 'severity' | 'repairClass' | 'recommendation'>} p
 * @returns {DiagnosticFinding}
 */
export function createFinding(p) {
  return {
    invariantIds: p.invariantIds ?? [],
    mutationAllowed: false,
    confidence: p.confidence ?? 'high',
    entityType: p.entityType,
    entityId: p.entityId,
    evidence: p.evidence ?? {},
    ...p,
    mutationAllowed: false,
  };
}

/**
 * @param {DiagnosticFinding[]} findings
 * @returns {ReliabilityScanReport}
 */
export function buildScanReport(findings, scanAt = new Date().toISOString()) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.severity in counts) counts[f.severity] += 1;
  }
  let verdict = 'PASS';
  if (counts.critical > 0 || counts.high > 0) verdict = 'FAIL';
  else if (counts.medium > 0) verdict = 'WARN';

  return {
    schemaVersion: DOCTOR_SCHEMA_VERSION,
    scanAt,
    mode: 'detect_only',
    detectOnly: true,
    autoRepairApplyEnabled: false,
    findings,
    counts,
    verdict,
  };
}

/**
 * @param {'PASS' | 'WARN' | 'FAIL'} verdict
 * @param {boolean} strict
 */
export function exitCodeForReliabilityReport(verdict, strict = false) {
  if (!strict) return 0;
  if (verdict === 'FAIL') return 1;
  if (verdict === 'WARN') return 2;
  return 0;
}
