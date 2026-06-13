import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { verifyStr02RootVercelRoute } from '../scripts/verify-str02-root-vercel-route.mjs';

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

function makeFixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'str02-route-verifier-'));
  const vercel =
    overrides.vercel ??
    {
      framework: 'nextjs',
      installCommand: 'npm install --include=dev && npm --prefix server install --include=dev',
      buildCommand: 'npm run build',
      rewrites: [{ source: '/webhooks/stripe', destination: '/api/webhooks/stripe' }],
    };
  const bridge =
    overrides.bridge ??
    `export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, code: 'method_not_allowed' });
    return;
  }
  req.url = '/webhooks/stripe';
  const { handleSlimStripeWebhookPost } = await import('../../server/handlers/slimStripeWebhookHandler.mjs');
  await handleSlimStripeWebhookPost(req, res, async () => () => {});
}
`;
  writeJson(join(root, 'vercel.json'), vercel);
  writeJson(join(root, 'package.json'), {
    scripts: {
      'verify:str02-route': 'node server/scripts/verify-str02-root-vercel-route.mjs',
    },
  });
  if (overrides.bridge !== null) {
    writeText(join(root, 'api/webhooks/stripe.mjs'), bridge);
  }
  writeText(join(root, 'server/handlers/slimStripeWebhookHandler.mjs'), 'export function handleSlimStripeWebhookPost() {}\n');
  for (const route of ['app/page.tsx', 'app/history/page.tsx', 'app/success/page.tsx', 'app/cancel/page.tsx']) {
    writeText(join(root, route), 'export default function Page() { return null; }\n');
  }
  return root;
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

function check(report, id) {
  return report.checks.find((c) => c.id === id);
}

describe('STR-02 root Vercel route verifier', () => {
  it('passes the current PR72 route bridge', () => {
    const report = verifyStr02RootVercelRoute();
    assert.equal(report.status, 'PASS');
    assert.equal(report.staticRouteBridgeVerification, 'PASS');
    assert.equal(check(report, 'webhook_rewrite_declared')?.passed, true);
    assert.equal(check(report, 'bridge_reuses_slim_handler')?.passed, true);
  });

  it('fails when /webhooks/stripe rewrite is missing', () => {
    const root = makeFixture({ vercel: { rewrites: [] } });
    try {
      const report = verifyStr02RootVercelRoute({ repoRoot: root });
      assert.equal(report.status, 'FAIL');
      assert.equal(check(report, 'webhook_rewrite_declared')?.passed, false);
    } finally {
      cleanup(root);
    }
  });

  it('fails when api/webhooks/stripe.mjs is missing', () => {
    const root = makeFixture({ bridge: null });
    try {
      const report = verifyStr02RootVercelRoute({ repoRoot: root });
      assert.equal(report.status, 'FAIL');
      assert.equal(check(report, 'root_webhook_bridge_exists')?.passed, false);
    } finally {
      cleanup(root);
    }
  });

  it('fails when bridge does not reference the existing slim handler', () => {
    const root = makeFixture({
      bridge: `export default function handler(req, res) {
  res.status(200).json({ ok: true });
}
`,
    });
    try {
      const report = verifyStr02RootVercelRoute({ repoRoot: root });
      assert.equal(report.status, 'FAIL');
      assert.equal(check(report, 'bridge_reuses_slim_handler')?.passed, false);
    } finally {
      cleanup(root);
    }
  });

  it('detects unsupported-method fail-closed behavior', () => {
    const root = makeFixture();
    try {
      const report = verifyStr02RootVercelRoute({ repoRoot: root });
      assert.equal(check(report, 'unsupported_methods_fail_closed')?.passed, true);
    } finally {
      cleanup(root);
    }
  });

  it('keeps verifier report schema stable', () => {
    const root = makeFixture();
    try {
      const report = verifyStr02RootVercelRoute({ repoRoot: root });
      assert.equal(report.schemaVersion, 1);
      assert.equal(report.reportType, 'STR02_ROOT_VERCEL_ROUTE_VERIFIER');
      assert.ok(Array.isArray(report.checks));
      for (const key of [
        'implementationMerged',
        'staticRouteBridgeVerification',
        'deployedVercelRouteSurface',
        'http200',
        'stripeResendAfterFix',
        'fixProven',
        'productionRealMoneyPilot',
        'selfHealingApply',
      ]) {
        assert.ok(Object.hasOwn(report, key), `missing schema key ${key}`);
      }
    } finally {
      cleanup(root);
    }
  });
});
