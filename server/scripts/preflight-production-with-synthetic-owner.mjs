#!/usr/bin/env node
/**
 * Same checks as `preflight:production`, with `ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE=true`
 * forced for this process only (non-routable owner placeholder). For local/CI convenience — not for
 * real production hosts.
 *
 * Run: npm --prefix server run preflight:production:with-synthetic-owner
 */
process.env.ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE = 'true';
await import('./preflight-production.mjs');
