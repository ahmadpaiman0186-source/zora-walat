/**
 * Reloadly real-topup readiness (read-only: no OAuth, no POST /topups, no secrets in output).
 */

import { buildReloadlyTopupPayload } from '../domain/fulfillment/reloadlyTopup.js';
import { resolveReloadlyOperatorId } from '../domain/fulfillment/reloadlyOperatorMapping.js';
import { RELOADLY_OAUTH_TOKEN_URL } from '../domain/fulfillment/reloadlyAuth.js';
import { envStrictTrue } from '../lib/localCheckoutProofRuntime.js';
import {
  RESTRICTED_REGION_CODES,
  isRestrictedRegionCode,
  restrictedSanctionedAlpha2Probe,
} from '../policy/restrictedRegions.js';
import {
  mergeReloadlyOperatorMaps,
  RELOADLY_OPERATOR_ID_DEFAULTS,
} from './reloadlyOperatorIdDefaults.js';

/** Afghanistan catalog keys that must map to Reloadly numeric operator ids. */
export const RELOADLY_AF_OPERATOR_KEYS = Object.freeze([
  'mtn',
  'roshan',
  'afghanwireless',
  'etisalat',
  'salaam',
]);

const PLACEHOLDER_RELOADLY_OP_ID = /^911\d{3}$/;

const TEMPLATE_MARKERS = [
  'your_real',
  'changeme',
  'placeholder',
  'real_id',
  'example',
  'todo:',
  'todo ',
  'xxx',
  'fill_me',
  'replace_me',
  'dummy',
  'skiptest',
];

/**
 * @param {string | undefined} value
 */
function valueLooksLikeTemplate(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return false;
  return TEMPLATE_MARKERS.some((m) => s.includes(m));
}

/**
 * @param {string | undefined} raw
 * @returns {Record<string, string>}
 */
function parseReloadlyOperatorMapJson(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
      return {};
    }
    /** @type {Record<string, string>} */
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = String(k).trim().toLowerCase();
      if (!key) continue;
      out[key] = String(v).trim();
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * @param {string | undefined} raw
 * @returns {{ explicit: boolean, sandbox: boolean | null }}
 */
function parseReloadlySandboxExplicit(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { explicit: false, sandbox: null };
  const l = s.toLowerCase();
  if (l === 'true' || l === '1' || l === 'yes') return { explicit: true, sandbox: true };
  if (l === 'false' || l === '0' || l === 'no') return { explicit: true, sandbox: false };
  return { explicit: false, sandbox: null };
}

/**
 * @param {string | undefined} raw
 * @returns {{ explicit: boolean, enabled: boolean | null }}
 */
function parseOutboundExplicit(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return { explicit: false, enabled: null };
  if (s === 'true') return { explicit: true, enabled: true };
  if (s === 'false') return { explicit: true, enabled: false };
  return { explicit: false, enabled: null };
}

/**
 * @param {NodeJS.ProcessEnv} [sourceEnv]
 */
export function evaluateReloadlyLiveReadinessPreflight(sourceEnv = process.env) {
  /** @type {string[]} */
  const blockers = [];
  /** @type {string[]} */
  const warnings = [];

  const airtime = String(sourceEnv.AIRTIME_PROVIDER ?? '').trim().toLowerCase();
  if (airtime !== 'reloadly') {
    blockers.push(
      'reloadly_airtime_provider: AIRTIME_PROVIDER must be reloadly for Reloadly top-up readiness',
    );
  }

  let cid = '';
  let csec = '';
  let sbx = { explicit: false, sandbox: /** @type {boolean | null} */ (null) };
  let ob = { explicit: false, enabled: /** @type {boolean | null} */ (null) };
  let reloadlySandbox = false;
  let outboundOn = false;
  let merged = { ...RELOADLY_OPERATOR_ID_DEFAULTS };
  /** @type {Record<string, { ok: boolean, code?: string }>} */
  let operatorResolution = {};

  if (airtime === 'reloadly') {
    cid = String(sourceEnv.RELOADLY_CLIENT_ID ?? '').trim();
    csec = String(sourceEnv.RELOADLY_CLIENT_SECRET ?? '').trim();
    if (cid.length < 8) {
      blockers.push(
        'reloadly_credentials: RELOADLY_CLIENT_ID must be set (min length 8; value not logged)',
      );
    }
    if (csec.length < 8) {
      blockers.push(
        'reloadly_credentials: RELOADLY_CLIENT_SECRET must be set (min length 8; value not logged)',
      );
    }
    if (valueLooksLikeTemplate(cid)) {
      blockers.push(
        'reloadly_credentials: RELOADLY_CLIENT_ID appears to be a template or placeholder',
      );
    }
    if (valueLooksLikeTemplate(csec)) {
      blockers.push(
        'reloadly_credentials: RELOADLY_CLIENT_SECRET appears to be a template or placeholder',
      );
    }

    sbx = parseReloadlySandboxExplicit(sourceEnv.RELOADLY_SANDBOX);
    if (!sbx.explicit) {
      blockers.push(
        'reloadly_sandbox: RELOADLY_SANDBOX must be explicitly true or false (use true for sandbox Topups audience, false for production Topups host)',
      );
    }
    reloadlySandbox = sbx.sandbox === true;

    ob = parseOutboundExplicit(sourceEnv.PHASE1_FULFILLMENT_OUTBOUND_ENABLED);
    if (!ob.explicit) {
      blockers.push(
        'reloadly_outbound: PHASE1_FULFILLMENT_OUTBOUND_ENABLED must be explicitly true or false',
      );
    }
    outboundOn = sourceEnv.PHASE1_FULFILLMENT_OUTBOUND_ENABLED === 'true';

    merged = mergeReloadlyOperatorMaps(
      RELOADLY_OPERATOR_ID_DEFAULTS,
      parseReloadlyOperatorMapJson(sourceEnv.RELOADLY_OPERATOR_MAP_JSON),
    );

    for (const key of RELOADLY_AF_OPERATOR_KEYS) {
      const r = resolveReloadlyOperatorId(key, merged);
      operatorResolution[key] = { ok: r.ok, ...(r.ok ? {} : { code: r.code }) };
      if (!r.ok) {
        blockers.push(
          `reloadly_operator_map: missing or invalid Reloadly operator id for Afghanistan operatorKey "${key}"`,
        );
      }
    }

    if (outboundOn && !reloadlySandbox) {
      let hasNonPlaceholder = false;
      for (const v of Object.values(merged)) {
        const id = String(v ?? '').trim();
        if (id && !PLACEHOLDER_RELOADLY_OP_ID.test(id)) {
          hasNonPlaceholder = true;
          break;
        }
      }
      if (!hasNonPlaceholder && !envStrictTrue(sourceEnv.PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED)) {
        blockers.push(
          'reloadly_live_outbound: live Topups (RELOADLY_SANDBOX=false) with PHASE1_FULFILLMENT_OUTBOUND_ENABLED=true requires real numeric operator ids in RELOADLY_OPERATOR_MAP_JSON (not 911xxx placeholders) or PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED=true after operator review',
        );
      }
    }

    if (reloadlySandbox && outboundOn) {
      warnings.push(
        'reloadly_mode: RELOADLY_SANDBOX=true with outbound enabled — confirm you intend sandbox Topups, not production host',
      );
    }

    if (!outboundOn) {
      warnings.push(
        'reloadly_outbound: PHASE1_FULFILLMENT_OUTBOUND_ENABLED=false — adapter will not POST to Reloadly until outbound is enabled',
      );
    }

    if (reloadlySandbox) {
      warnings.push(
        'reloadly_sandbox: RELOADLY_SANDBOX=true — OAuth uses sandbox Topups audience; set RELOADLY_SANDBOX=false only when ready for production Reloadly host',
      );
    }

    const syntheticOrderBase = {
      id: 'reloadly_preflight_synthetic',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      amountUsdCents: 1000,
      pricingSnapshot: null,
    };
    const payloadNational = buildReloadlyTopupPayload(
      /** @type {any} */ (syntheticOrderBase),
      merged,
      { customIdentifier: 'preflight', providerRequestKey: 'preflight-prk' },
    );
    if (!payloadNational.ok) {
      blockers.push(
        `reloadly_payload: buildReloadlyTopupPayload (national MSISDN) failed: ${payloadNational.message}`,
      );
    } else {
      const ph = payloadNational.body.recipientPhone;
      if (ph?.countryCode !== 'AF' || ph?.number !== '93701234567') {
        blockers.push(
          `reloadly_phone_normalization: expected recipientPhone { countryCode: "AF", number: "93701234567" }, got ${JSON.stringify(ph)}`,
        );
      }
      if (payloadNational.body.amount !== '10.00') {
        blockers.push(
          `reloadly_amount_mapping: expected amount "10.00" from amountUsdCents=1000, got ${String(payloadNational.body.amount)}`,
        );
      }
    }

    const syntheticOrderSnap = {
      ...syntheticOrderBase,
      id: 'reloadly_preflight_snap',
      pricingSnapshot: { customerProductValueUsdCents: 500 },
    };
    const payloadSnap = buildReloadlyTopupPayload(
      /** @type {any} */ (syntheticOrderSnap),
      merged,
      { customIdentifier: 'preflight2', providerRequestKey: 'preflight-prk-2' },
    );
    if (!payloadSnap.ok) {
      blockers.push(
        `reloadly_payload_snapshot: buildReloadlyTopupPayload (pricingSnapshot) failed: ${payloadSnap.message}`,
      );
    } else if (payloadSnap.body.amount !== '5.00') {
      blockers.push(
        `reloadly_amount_mapping: expected amount "5.00" from pricingSnapshot customerProductValueUsdCents=500, got ${String(payloadSnap.body.amount)}`,
      );
    }
  }

  const oauthUrlOk =
    RELOADLY_OAUTH_TOKEN_URL === 'https://auth.reloadly.com/oauth/token';
  if (!oauthUrlOk) {
    blockers.push('reloadly_oauth: RELOADLY_OAUTH_TOKEN_URL invariant failed (code regression)');
  }

  if (!isRestrictedRegionCode(restrictedSanctionedAlpha2Probe())) {
    blockers.push(
      'restricted_regions: sanctioned primary alpha-2 probe must remain blocked (policy regression)',
    );
  }
  if (!RESTRICTED_REGION_CODES.includes('CU')) {
    blockers.push('restricted_regions: expected code CU missing from RESTRICTED_REGION_CODES');
  }
  if (!RESTRICTED_REGION_CODES.includes('KP')) {
    blockers.push('restricted_regions: expected code KP missing from RESTRICTED_REGION_CODES');
  }

  const uniqueBlockers = [...new Set(blockers)];

  return {
    ok: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    warnings,
    checks: {
      airtimeProviderReloadly: airtime === 'reloadly',
      reloadlyClientIdConfigured: cid.length >= 8,
      reloadlyClientSecretConfigured: csec.length >= 8,
      reloadlySandboxExplicit: sbx.explicit,
      reloadlySandboxMode: reloadlySandbox,
      phase1FulfillmentOutboundExplicit: ob.explicit,
      phase1FulfillmentOutboundEnabled: outboundOn,
      reloadlyLiveOutboundApprovedStrict: envStrictTrue(
        sourceEnv.PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED,
      ),
      operatorMapJsonBytes: String(sourceEnv.RELOADLY_OPERATOR_MAP_JSON ?? '').trim().length,
      operatorResolutionAfghanistan: operatorResolution,
      oauthTokenUrlConfigured: oauthUrlOk,
      restrictedRegionPolicyOk:
        isRestrictedRegionCode(restrictedSanctionedAlpha2Probe()) &&
        RESTRICTED_REGION_CODES.includes('CU') &&
        RESTRICTED_REGION_CODES.includes('KP'),
      restrictedRegionListLength: RESTRICTED_REGION_CODES.length,
    },
  };
}
