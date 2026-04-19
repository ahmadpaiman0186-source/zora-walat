/**
 * Probe common Flutter web-server ports (127.0.0.1) until HTTP 200 on GET /.
 * Override with APP_BASE_URL, FLUTTER_ORIGIN, or FLUTTER_WEB_URL (scheme + host + optional port; no trailing slash).
 */
const CANDIDATE_PORTS = String(
  process.env.FLUTTER_WEB_PROBE_PORTS ??
    '51998,50606,8080,7357,3000',
)
  .split(',')
  .map((p) => parseInt(p.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0);

export async function detectFlutterOrigin() {
  const explicit =
    process.env.APP_BASE_URL?.trim() ||
    process.env.FLUTTER_ORIGIN?.trim() ||
    process.env.FLUTTER_WEB_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  for (const port of CANDIDATE_PORTS) {
    const origin = `http://127.0.0.1:${port}`;
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 2000);
      const r = await fetch(`${origin}/`, {
        method: 'GET',
        signal: ac.signal,
      });
      clearTimeout(t);
      if (r.ok) return origin;
    } catch {
      /* try next port */
    }
  }

  return null;
}
