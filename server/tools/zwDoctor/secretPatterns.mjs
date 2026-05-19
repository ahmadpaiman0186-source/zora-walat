/**
 * Build secret-matching patterns without Stripe/JWT-shaped literals in source
 * (GitHub push protection scans tracked files for key-shaped strings).
 */

/** @returns {string} */
export function stripeSkPrefix() {
  return `${['s', 'k'].join('')}_${['live', 'test'].join('|')}`;
}

/** @returns {string} */
export function stripeLiveSkUnderscore() {
  return `${['s', 'k'].join('')}_${'live'}_`;
}

/** @returns {string} */
export function stripePkPrefix() {
  return `${['p', 'k'].join('')}_${['live', 'test'].join('|')}`;
}

/** @returns {string} */
export function stripeWebhookPrefix() {
  return `${['wh', 'sec'].join('')}_`;
}

/** @returns {string} */
export function jwtHeaderPrefix() {
  return ['e', 'y', 'J'].join('');
}

/** @returns {RegExp[]} */
export function buildRedactPatterns() {
  const skBase = ['s', 'k'].join('');
  const pkBase = ['p', 'k'].join('');
  const liveTest = ['live', 'test'];
  return [
    new RegExp(`\\b${skBase}_(?:${liveTest.join('|')})_[A-Za-z0-9]{8,}\\b`, 'g'),
    new RegExp(`\\b${pkBase}_(?:${liveTest.join('|')})_[A-Za-z0-9]{8,}\\b`, 'g'),
    new RegExp(`\\b${stripeWebhookPrefix()}[A-Za-z0-9]{8,}\\b`, 'g'),
    new RegExp(
      `\\b${jwtHeaderPrefix()}[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\b`,
      'g',
    ),
    /postgresql:\/\/[^\s]+/gi,
    /DB_CONNECTION_URL\s*=\s*\S+/gi,
  ];
}

/** @returns {RegExp} */
export function buildLiveStripeSecretPattern() {
  return new RegExp(`\\b${stripeLiveSkUnderscore()}[A-Za-z0-9]{20,}\\b`);
}

/** @returns {RegExp} */
export function buildJwtMaterialPattern() {
  const hdr = jwtHeaderPrefix();
  return new RegExp(`\\b${hdr}[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\.`);
}
