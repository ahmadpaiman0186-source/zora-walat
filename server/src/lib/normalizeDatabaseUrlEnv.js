/**
 * Strip BOM / wrapping quotes sometimes introduced when `DATABASE_URL` is pasted via host UIs.
 * Never logs the value.
 * @param {string | undefined} raw
 * @returns {string}
 */
export function normalizeDatabaseUrlEnv(raw) {
  let s = String(raw ?? '').trim();
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}
