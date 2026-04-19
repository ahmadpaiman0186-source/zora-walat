import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

/** `DATABASE_URL` comes from `server/.env` via `test/setupTestEnv.mjs` (`npm test` only). */
const hasDb = Boolean(process.env.DATABASE_URL);

describe('reloadlyWebtopupDurableCircuit (DB)', { skip: !hasDb }, () => {
  /** @type {typeof import('../src/db.js').prisma} */
  let prisma;
  /** @type {typeof import('../src/services/reliability/reloadlyWebtopupDurableCircuit.js')} */
  let circuit;

  before(async () => {
    process.env.WEBTOPUP_RELOADLY_CIRCUIT_FAILURE_THRESHOLD = '3';
    process.env.WEBTOPUP_RELOADLY_CIRCUIT_WINDOW_MS = '600000';
    process.env.WEBTOPUP_RELOADLY_CIRCUIT_COOLDOWN_MS = '300';
    process.env.WEBTOPUP_RELOADLY_CIRCUIT_HALF_OPEN_MAX_PROBES = '2';
    process.env.WEBTOPUP_RELOADLY_DURABLE_CIRCUIT_ENABLED = 'true';

    const db = await import('../src/db.js');
    prisma = db.prisma;
    circuit = await import('../src/services/reliability/reloadlyWebtopupDurableCircuit.js');
  });

  beforeEach(async () => {
    await circuit.resetReloadlyWebtopupDurableCircuitForTests();
  });

  it('repeated failures open the breaker', async () => {
    for (let i = 0; i < 3; i += 1) {
      await circuit.recordReloadlyWebtopupProviderOutcome({
        success: false,
        log: undefined,
        traceId: `f${i}`,
      });
    }
    const snap = await circuit.getReloadlyWebtopupDurableCircuitAdminSnapshot();
    assert.equal(snap.state, 'open');
    assert.ok(snap.cooldownUntil);
  });

  it('open breaker blocks outbound attempts until half-open', async () => {
    for (let i = 0; i < 3; i += 1) {
      await circuit.recordReloadlyWebtopupProviderOutcome({ success: false, log: undefined, traceId: 'x' });
    }
    const g1 = await circuit.checkAllowReloadlyWebtopupCall({ log: undefined, traceId: 't' });
    assert.equal(g1.allowed, false);
    assert.equal(g1.state, 'open');

    await prisma.webtopupProviderCircuitState.update({
      where: { providerId: circuit.RELOADLY_WEBTOPUP_PROVIDER_ID },
      data: {
        cooldownUntil: new Date(Date.now() - 1000),
      },
    });

    const g2 = await circuit.checkAllowReloadlyWebtopupCall({ log: undefined, traceId: 't2' });
    assert.equal(g2.allowed, true);
    assert.equal(g2.state, 'half_open');
  });

  it('successful half-open probe closes the breaker', async () => {
    for (let i = 0; i < 3; i += 1) {
      await circuit.recordReloadlyWebtopupProviderOutcome({ success: false, log: undefined, traceId: 'x' });
    }
    await prisma.webtopupProviderCircuitState.update({
      where: { providerId: circuit.RELOADLY_WEBTOPUP_PROVIDER_ID },
      data: { cooldownUntil: new Date(Date.now() - 1000) },
    });
    await circuit.checkAllowReloadlyWebtopupCall({ log: undefined, traceId: 'probe' });
    await circuit.recordReloadlyWebtopupProviderOutcome({ success: true, log: undefined, traceId: 'ok' });

    const snap = await circuit.getReloadlyWebtopupDurableCircuitAdminSnapshot();
    assert.equal(snap.state, 'closed');
    assert.equal(snap.recentFailureCount, 0);
  });

  it('executeTopupWithReliability does not call sendTopup when breaker is open', async () => {
    const { executeTopupWithReliability } = await import('../src/services/providers/providerRouter.js');
    const { resetSharedCircuitBreakersForTests } = await import('../src/services/reliability/circuitBreaker.js');

    const prevFb = process.env.WEBTOPUP_FALLBACK_PROVIDER;
    process.env.WEBTOPUP_FALLBACK_PROVIDER = '';
    try {
      for (let i = 0; i < 3; i += 1) {
        await circuit.recordReloadlyWebtopupProviderOutcome({ success: false, log: undefined, traceId: 'x' });
      }
      resetSharedCircuitBreakersForTests();

      let calls = 0;
      const request = {
        orderId: 'ord1',
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'x',
        operatorLabel: 'x',
        phoneNationalDigits: '712345678',
        productId: 'p',
        productName: 'p',
        amountCents: 100,
        currency: 'usd',
      };

      const out = await executeTopupWithReliability({
        request,
        primary: {
          id: 'reloadly',
          sendTopup: async () => {
            calls += 1;
            return { outcome: 'succeeded', providerReference: 'nope' };
          },
        },
        log: undefined,
        traceId: 'gate',
        orderIdSuffix: 'sufixxxx',
      });

      assert.equal(calls, 0);
      assert.equal(out.outcome, 'failed_retryable');
      assert.equal(out.errorCode, 'provider_circuit_open');
    } finally {
      process.env.WEBTOPUP_FALLBACK_PROVIDER = prevFb ?? '';
    }
  });

  it('failed half-open probe reopens the breaker', async () => {
    for (let i = 0; i < 3; i += 1) {
      await circuit.recordReloadlyWebtopupProviderOutcome({ success: false, log: undefined, traceId: 'x' });
    }
    await prisma.webtopupProviderCircuitState.update({
      where: { providerId: circuit.RELOADLY_WEBTOPUP_PROVIDER_ID },
      data: { cooldownUntil: new Date(Date.now() - 1000) },
    });
    await circuit.checkAllowReloadlyWebtopupCall({ log: undefined, traceId: 'probe' });
    await circuit.recordReloadlyWebtopupProviderOutcome({ success: false, log: undefined, traceId: 'bad' });

    const snap = await circuit.getReloadlyWebtopupDurableCircuitAdminSnapshot();
    assert.equal(snap.state, 'open');
  });
});
