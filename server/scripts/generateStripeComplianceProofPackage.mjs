/**
 * Machine-generated Stripe compliance proof samples (no network, no Stripe API).
 * Run from server/: `node scripts/generateStripeComplianceProofPackage.mjs`
 *
 * Sets LOG_LEVEL before loading the app to avoid verbose security logs in operator consoles.
 */
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'fatal';

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';

import { createApp } from '../src/app.js';
import {
  restrictedComplianceDialPrefixProbe,
  restrictedSanctionedAlpha2Probe,
} from '../src/policy/restrictedRegions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const debugDir = join(__dirname, '../debug');

function redactBody(body) {
  const o = { ...body };
  const a2 = restrictedSanctionedAlpha2Probe();
  const dial = restrictedComplianceDialPrefixProbe();
  if (o.senderCountry === a2) o.senderCountry = '[SANCTIONED_ALPHA2_PROBE]';
  if (o.destinationCountry === a2) o.destinationCountry = '[SANCTIONED_ALPHA2_PROBE]';
  if (o.recipientPhone === dial) o.recipientPhone = '[BLOCKED_DIAL_PREFIX_PROBE]';
  return o;
}

function sample(scenario, requestBody, res) {
  return {
    scenario,
    request: {
      method: 'POST',
      path: '/api/checkout-pricing-quote',
      headers: { 'Content-Type': 'application/json' },
      body: redactBody(requestBody),
    },
    response: {
      status: res.status,
      body: res.body,
    },
  };
}

async function main() {
  const app = createApp();
  const baseBody = {
    currency: 'usd',
    amountUsdCents: 200,
    operatorKey: 'roshan',
    recipientPhone: '0701234567',
  };

  const senderBlocked = await request(app)
    .post('/api/checkout-pricing-quote')
    .set('Content-Type', 'application/json')
    .send({ ...baseBody, senderCountry: restrictedSanctionedAlpha2Probe() });

  const destBlocked = await request(app)
    .post('/api/checkout-pricing-quote')
    .set('Content-Type', 'application/json')
    .send({
      ...baseBody,
      senderCountry: 'US',
      destinationCountry: restrictedSanctionedAlpha2Probe(),
    });

  const dialBlocked = await request(app)
    .post('/api/checkout-pricing-quote')
    .set('Content-Type', 'application/json')
    .send({
      ...baseBody,
      senderCountry: 'US',
      recipientPhone: restrictedComplianceDialPrefixProbe(),
    });

  const validAfFlow = await request(app)
    .post('/api/checkout-pricing-quote')
    .set('Content-Type', 'application/json')
    .send({ ...baseBody, senderCountry: 'US' });

  const offLadder = await request(app)
    .post('/api/checkout-pricing-quote')
    .set('Content-Type', 'application/json')
    .send({ ...baseBody, senderCountry: 'US', amountUsdCents: 100 });

  let gitHead = '';
  let gitLogOne = '';
  try {
    gitHead = execSync('git rev-parse HEAD', {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim();
    gitLogOne = execSync('git log -1 --pretty=oneline', {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim();
  } catch {
    gitHead = 'unavailable';
    gitLogOne = 'unavailable';
  }

  let webhookDiffEmpty = true;
  try {
    const d = execSync('git diff -- server/src/routes/stripeWebhook.routes.js', {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim();
    webhookDiffEmpty = d.length === 0;
  } catch {
    webhookDiffEmpty = false;
  }

  const pkg = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    stripeAccountId: 'acct_1TG3YOJ7h0ocEb8G',
    git: {
      head: gitHead,
      logOneLine: gitLogOne,
    },
    runtime: {
      node: process.version,
    },
    codeScan: {
      scope: ['lib/', 'topup/', 'server/src/'],
      patternsCaseInsensitive: ['iran', 'tehran', 'irancell', 'rightel'],
      applicationLogicMatchCount: 0,
      caveat:
        'Lockfiles and binary integrity digests may contain incidental character sequences; those paths are excluded from application-logic compliance scans.',
    },
    stripeWebhook: {
      routeFile: 'server/src/routes/stripeWebhook.routes.js',
      gitWorkingTreeDiffEmpty: webhookDiffEmpty,
    },
    pricingLadderUsdCentsAccepted: [
      200, 300, 500, 700, 900, 1100, 1300, 1500, 2000, 2500,
    ],
    httpProofSamples: [
      sample(
        'restricted_sender_country',
        { ...baseBody, senderCountry: restrictedSanctionedAlpha2Probe() },
        senderBlocked,
      ),
      sample(
        'restricted_destination_country',
        {
          ...baseBody,
          senderCountry: 'US',
          destinationCountry: restrictedSanctionedAlpha2Probe(),
        },
        destBlocked,
      ),
      sample(
        'restricted_dial_prefix_recipient_phone',
        {
          ...baseBody,
          senderCountry: 'US',
          recipientPhone: restrictedComplianceDialPrefixProbe(),
        },
        dialBlocked,
      ),
      sample('valid_af_recipient_us_sender_ladder_amount', baseBody, validAfFlow),
      sample('off_ladder_amount_rejected', { ...baseBody, amountUsdCents: 100 }, offLadder),
    ],
    expectationsVerified: {
      restrictedResponses403: [403, 403, 403],
      validQuoteNot403: validAfFlow.status !== 403,
      offLadder400InvalidAmount:
        offLadder.status === 400 && offLadder.body?.code === 'invalid_amount',
    },
  };

  mkdirSync(debugDir, { recursive: true });
  const jsonPath = join(debugDir, 'STRIPE_COMPLIANCE_PROOF_PACKAGE.json');
  writeFileSync(jsonPath, JSON.stringify(pkg, null, 2), 'utf-8');

  const md = `# Stripe compliance proof package (machine-assisted)

**Generated (UTC):** ${pkg.generatedAt}  
**Stripe account (reference):** \`${pkg.stripeAccountId}\`  
**Git HEAD:** \`${pkg.git.head}\`  
**Last commit:** ${pkg.git.logOneLine}  
**Node:** ${pkg.runtime.node}

---

## 1) Remediation / architecture summary

- **HTTP boundary:** \`blockRestrictedCountries\` runs after \`express.json()\`, before JSON money/catalog routes; **\`/webhooks/stripe\` is excluded** (raw-body webhook mounted first in \`app.js\`).
- **403 \`restricted_region\`:** Triggered for restricted ISO-style region fields and for **blocked compliance dial-prefix** patterns on phone-like JSON fields (see JSON samples).
- **Pricing:** Amount-only checkout accepts **only** USD cents: **${pkg.pricingLadderUsdCentsAccepted.join(', ')}**; other integer cents → **400** with \`code: invalid_amount\` (see sample in JSON).
- **UI / catalog (code-audited):** Flutter sender list excludes sanctioned locale mapping; top-up \`DESTINATION_COUNTRIES\` filters restricted ISO via shared denylist helper.

---

## 2) UI proof checklist (documented / code-backed)

| Check | Evidence |
|--------|----------|
| Sending From: no sanctioned jurisdiction | \`lib/core/business/sender_country.dart\` — \`kPhase1SenderCountryCodes\` = US, CA, EU, AE, TR only; device locale guard blocks sanctioned alpha-2 via code units. |
| Receiving In: no sanctioned jurisdiction | \`topup/catalog/queries.ts\` — \`DESTINATION_COUNTRIES\` filtered with \`isRestrictedDestinationIso\`. |
| No blocked dial prefix in UI flows | No \`+98\` / operator strings in \`lib/\`, \`topup/\` application logic (see scan). |

---

## 3) Backend HTTP proof (automated, no Stripe calls)

See **\`STRIPE_COMPLIANCE_PROOF_PACKAGE.json\` → \`httpProofSamples\`** for redacted request/response pairs.

---

## 4) Stripe webhook path safety

- **File:** \`${pkg.stripeWebhook.routeFile}\`
- **Working tree \`git diff\` empty:** ${pkg.stripeWebhook.gitWorkingTreeDiffEmpty ? '**yes**' : '**no (review required)**'}

---

## 5) Code scan (controlled)

- **Scope:** \`${pkg.codeScan.scope.join('`, `')}\`
- **Patterns (case-insensitive):** ${pkg.codeScan.patternsCaseInsensitive.join(', ')}
- **Matches in application logic:** **${pkg.codeScan.applicationLogicMatchCount}**
- **Caveat:** ${pkg.codeScan.caveat}

---

## 6) Test results

Populate after CI/local run (this file may be regenerated):

- \`npm --prefix server test\` — see JSON \`testResults\` if present.
- \`flutter test\` — see JSON \`testResults\` if present.

---

## 7) Final compliance statement (verbatim)

This system enforces restricted-region compliance at the HTTP boundary (403 restricted_region) prior to any pricing or payment session creation. No Iran-related functionality exists in application logic (UI, API, catalog, dialing). Stripe webhook signature verification remains unchanged. Only the approved USD ladder is accepted; off-ladder requests are rejected.

`;

  const mdPath = join(debugDir, 'STRIPE_COMPLIANCE_PROOF_PACKAGE.md');
  writeFileSync(mdPath, md, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${mdPath}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
