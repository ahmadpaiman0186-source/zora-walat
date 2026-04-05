'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLocale } from '@/components/i18n/localeContext';
import type { UiLocale, UiMessages } from '@/messages';
import {
  clearTopupUpdateToken,
  getOrCreateCheckoutSessionKey,
  getTopupUpdateToken,
  saveCheckoutSessionKey,
  saveTopupUpdateToken,
} from '@/topup/checkoutSession';
import type { PublicTopupOrder } from '@/topup/publicTopupOrder';
import {
  DESTINATION_COUNTRIES,
  ORIGIN_COUNTRIES,
  PRODUCT_TYPE_IDS,
  countryLabel,
  getOffer,
  operatorsForDestination,
} from '@/topup/catalog';
import type { ProductType } from '@/topup/catalog';

import { OrderSuccessPanel } from './OrderSuccessPanel';
import { PaymentConfirmForm } from './PaymentConfirmForm';
import styles from './ZoraWalatTopUp.module.css';

const defaultApiBase = 'http://127.0.0.1:8787';

function formatUsd(cents: number, locale: UiLocale): string {
  const tag =
    locale === 'tr' ? 'tr-TR' : locale === 'ar' ? 'ar' : locale === 'fa' ? 'fa' : 'en-US';
  return (cents / 100).toLocaleString(tag, {
    style: 'currency',
    currency: 'USD',
  });
}

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

function isPhonePlausible(digits: string): boolean {
  return digits.length >= 9 && digits.length <= 15;
}

function productLabel(
  type: ProductType,
  m: ReturnType<typeof useLocale>['messages'],
): string {
  switch (type) {
    case 'airtime':
      return m.form.productTypeAirtime;
    case 'data':
      return m.form.productTypeData;
    case 'calling':
      return m.form.productTypeCalling;
    default:
      return type;
  }
}

export function ZoraWalatTopUp() {
  const { messages: m, locale } = useLocale();

  const stripePublishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';

  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  const [countryFrom, setCountryFrom] = useState('US');
  const [countryTo, setCountryTo] = useState('AF');
  const [productType, setProductType] = useState<ProductType>('airtime');
  const [operatorId, setOperatorId] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    null,
  );

  const [step, setStep] = useState<
    'idle' | 'loading_intent' | 'checkout' | 'success' | 'error'
  >('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<PublicTopupOrder | null>(
    null,
  );

  /** Avoid stale closures between PI creation and Stripe `onSuccess`. */
  const checkoutContextRef = useRef<{
    orderId: string | null;
    updateToken: string | null;
    paymentIntentId: string | null;
  }>({ orderId: null, updateToken: null, paymentIntentId: null });

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? defaultApiBase
  ).replace(/\/+$/, '');

  const operatorChoices = useMemo(
    () => operatorsForDestination(countryTo, productType),
    [countryTo, productType],
  );

  useEffect(() => {
    setOperatorId('');
  }, [countryTo, productType]);

  const offer = useMemo(
    () =>
      operatorId ? getOffer(countryTo, productType, operatorId) : undefined,
    [countryTo, productType, operatorId],
  );

  const priceOptions = offer?.amountOptions ?? [];

  useEffect(() => {
    const first = offer?.amountOptions[0];
    setSelectedOptionId(first?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- offer?.id encodes operator × product × destination
  }, [offer?.id]);

  const selectedOption =
    priceOptions.find((o) => o.id === selectedOptionId) ?? priceOptions[0];
  const amountCents = selectedOption?.priceUsdCents ?? 0;

  const digits = normalizePhoneDigits(phone);
  const formValid =
    operatorId.length > 0 &&
    isPhonePlausible(digits) &&
    selectedOption != null &&
    amountCents >= 50;

  const summaryMoney =
    selectedOption != null && amountCents >= 50
      ? formatUsd(amountCents, locale)
      : m.summary.notSet;

  const opLabel =
    operatorId.length > 0
      ? operatorChoices.find((o) => o.key === operatorId)?.label ?? operatorId
      : '';

  const planLabel = selectedOption
    ? [selectedOption.label, selectedOption.detail].filter(Boolean).join(' · ')
    : '';

  const startPayment = useCallback(async () => {
    setErrorMessage(null);
    setFormError(null);

    if (!operatorId) {
      setFormError(m.form.validationOperator);
      return;
    }
    if (!isPhonePlausible(digits)) {
      setFormError(m.form.validationPhone);
      return;
    }
    if (!selectedOption || !offer) {
      setFormError(m.form.validationProduct);
      return;
    }

    if (!stripePublishableKey) {
      setStep('error');
      setErrorMessage(m.error.configStripe);
      return;
    }
    if (!stripePromise) {
      setStep('error');
      setErrorMessage(m.error.stripeInit);
      return;
    }

    setStep('loading_intent');
    checkoutContextRef.current = {
      orderId: null,
      updateToken: null,
      paymentIntentId: null,
    };
    try {
      const sessionKey = getOrCreateCheckoutSessionKey();
      const idempotencyKey = crypto.randomUUID();
      const createRes = await fetch(`${apiBase}/api/topup-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          sessionKey: sessionKey || undefined,
          originCountry: countryFrom,
          destinationCountry: countryTo,
          productType,
          operatorKey: operatorId,
          operatorLabel: opLabel,
          phoneNumber: digits,
          productId: offer.id,
          productName: offer.productName,
          selectedAmountLabel: planLabel,
          amountCents,
          currency: 'usd',
        }),
      });
      const createData: unknown = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        const msg =
          typeof createData === 'object' &&
          createData !== null &&
          'error' in createData &&
          typeof (createData as { error: unknown }).error === 'string'
            ? (createData as { error: string }).error
            : m.error.orderCreate;
        setErrorMessage(msg);
        setStep('error');
        return;
      }
      const created = createData as {
        order?: PublicTopupOrder;
        updateToken?: string;
        sessionKey?: string;
        idempotentReplay?: boolean;
      };
      if (!created.order?.id) {
        setErrorMessage(m.error.orderCreate);
        setStep('error');
        return;
      }
      const resolvedToken =
        typeof created.updateToken === 'string' && created.updateToken.length > 0
          ? created.updateToken
          : getTopupUpdateToken(created.order.id);
      if (!resolvedToken) {
        setErrorMessage(m.error.orderCreate);
        setStep('error');
        return;
      }
      saveCheckoutSessionKey(created.sessionKey ?? sessionKey);
      checkoutContextRef.current.orderId = created.order.id;
      checkoutContextRef.current.updateToken = resolvedToken;
      saveTopupUpdateToken(created.order.id, resolvedToken);

      const res = await fetch(`${apiBase}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountCents,
          orderId: created.order.id,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : `HTTP ${res.status}`;
        setErrorMessage(msg);
        setStep('error');
        return;
      }

      const secret =
        typeof data === 'object' &&
        data !== null &&
        'clientSecret' in data &&
        typeof (data as { clientSecret: unknown }).clientSecret === 'string'
          ? (data as { clientSecret: string }).clientSecret
          : null;

      const paymentIntentId =
        typeof data === 'object' &&
        data !== null &&
        'paymentIntentId' in data &&
        typeof (data as { paymentIntentId: unknown }).paymentIntentId ===
          'string'
          ? (data as { paymentIntentId: string }).paymentIntentId
          : null;

      if (!secret || !paymentIntentId) {
        setErrorMessage(m.error.noSecret);
        setStep('error');
        return;
      }

      checkoutContextRef.current.paymentIntentId = paymentIntentId;
      setClientSecret(secret);
      setStep('checkout');
    } catch (e) {
      console.error('[checkout] create order / payment-intent failed', e);
      setErrorMessage(m.error.network);
      setStep('error');
    }
  }, [
    amountCents,
    apiBase,
    countryFrom,
    countryTo,
    digits,
    m.error.configStripe,
    m.error.network,
    m.error.noSecret,
    m.error.stripeInit,
    m.error.orderCreate,
    m.form.validationOperator,
    m.form.validationPhone,
    m.form.validationProduct,
    offer,
    opLabel,
    planLabel,
    operatorId,
    productType,
    selectedOption,
    stripePromise,
    stripePublishableKey,
  ]);

  const finalizePaidOrder = useCallback(async () => {
    const ctx = checkoutContextRef.current;
    if (!ctx.orderId || !ctx.updateToken || !ctx.paymentIntentId) {
      setErrorMessage(m.error.orderFinalize);
      return;
    }
    const sessionKey = getOrCreateCheckoutSessionKey();
    try {
      const res = await fetch(
        `${apiBase}/api/topup-orders/${encodeURIComponent(ctx.orderId)}/mark-paid`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updateToken: ctx.updateToken,
            paymentIntentId: ctx.paymentIntentId,
            sessionKey,
          }),
        },
      );
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : m.error.orderFinalize;
        setErrorMessage(msg);
        return;
      }
      const body = data as { order?: PublicTopupOrder };
      if (!body.order) {
        setErrorMessage(m.error.orderFinalize);
        return;
      }
      setCompletedOrder(body.order);
      setErrorMessage(null);
      if (ctx.orderId) clearTopupUpdateToken(ctx.orderId);
      setStep('success');
    } catch (e) {
      console.error('[checkout] mark-paid failed', e);
      setErrorMessage(m.error.orderFinalize);
    }
  }, [apiBase, m.error.orderFinalize]);

  const busyIntent = step === 'loading_intent';
  const showContinue =
    step === 'idle' || step === 'error' || step === 'loading_intent';
  const showStripe =
    step === 'checkout' && stripePromise && clientSecret;

  const maskedRecipient =
    digits.length >= 4 ? `•••• ${digits.slice(-4)}` : m.summary.notSet;

  const resetFlow = () => {
    const prevId = checkoutContextRef.current.orderId;
    if (prevId) clearTopupUpdateToken(prevId);
    setClientSecret(null);
    setStep('idle');
    setErrorMessage(null);
    setFormError(null);
    setCompletedOrder(null);
    checkoutContextRef.current = {
      orderId: null,
      updateToken: null,
      paymentIntentId: null,
    };
  };

  const fromLabel = countryLabel(countryFrom, ORIGIN_COUNTRIES);
  const toLabel = countryLabel(countryTo, DESTINATION_COUNTRIES);
  const opSummaryLabel =
    operatorId.length > 0 ? opLabel || operatorId : m.summary.notSet;
  const planSummaryLabel =
    planLabel.length > 0 ? planLabel : m.summary.notSet;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <div className={styles.logoMark} aria-hidden>
            ⚡
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>{m.brand.name}</span>
            <span className={styles.brandBadge}>{m.brand.badge}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <LanguageSwitcher />
          <nav className={styles.headerNav} aria-label="Secondary">
            <Link href="/history" className={styles.navLink}>
              {m.header.navOrderHistory}
            </Link>
            <span className={styles.navLink}>{m.header.navHowItWorks}</span>
            <span className={styles.navLink}>{m.header.navSupport}</span>
            <span className={styles.trustChip}>{m.header.trustRibbon}</span>
          </nav>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 id="hero-heading" className={styles.heroTitle}>
              {m.hero.headlineLead}
              <span className={styles.heroAccent}>{m.hero.headlineAccent}</span>
              {m.hero.headlineTail}
            </h1>
            <p className={styles.heroSub}>{m.hero.subline}</p>
            <div className={styles.heroStats}>
              <div className={styles.statPill}>
                <span className={styles.statDot} aria-hidden />
                {m.hero.statInstant}
              </div>
              <div className={styles.statPill}>
                <span className={styles.statDot} aria-hidden />
                {m.hero.statSecure}
              </div>
              <div className={styles.statPill}>
                <span className={styles.statDot} aria-hidden />
                {m.hero.statCoverage}
              </div>
            </div>
          </div>
          <div className={styles.heroGlow} aria-hidden>
            <div className={styles.heroGlowInner} />
            <p className={styles.heroGlowLabel}>
              {fromLabel} → {toLabel} · {m.hero.routeFootnote}
            </p>
          </div>
        </div>
      </section>

      {step === 'success' && completedOrder ? (
        <OrderSuccessPanel
          order={completedOrder}
          messages={m}
          locale={locale}
          formatUsd={formatUsd}
          productLabel={productLabel}
          onAgain={resetFlow}
        />
      ) : (
        <>
          {busyIntent && (
            <div className={styles.loadingBanner} role="status">
              <span className={styles.spinner} aria-hidden />
              {m.form.continuing}
            </div>
          )}

          <div className={styles.grid}>
            <div className={styles.mainColumn}>
              {errorMessage && (
                <div className={styles.alertError} role="alert">
                  {errorMessage}
                </div>
              )}

              <article className={styles.card} aria-labelledby="form-title">
                <div className={styles.cardHeader}>
                  <h2 id="form-title" className={styles.cardTitle}>
                    {m.form.title}
                  </h2>
                  <p className={styles.cardSubtitle}>{m.form.subtitle}</p>
                </div>

                <div className={`${styles.field} ${styles.productField}`}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>{m.form.productType}</span>
                  </div>
                  <div
                    className={styles.productRow}
                    role="group"
                    aria-label={m.form.productType}
                  >
                    {PRODUCT_TYPE_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          productType === id
                            ? `${styles.productChip} ${styles.productChipActive}`
                            : styles.productChip
                        }
                        onClick={() => setProductType(id)}
                        aria-pressed={productType === id}
                      >
                        {productLabel(id, m)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="country-from">
                      {m.form.countryFrom}
                    </label>
                  </div>
                  <select
                    id="country-from"
                    className={styles.select}
                    value={countryFrom}
                    onChange={(e) => setCountryFrom(e.target.value)}
                  >
                    {ORIGIN_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="country-to">
                      {m.form.countryTo}
                    </label>
                  </div>
                  <select
                    id="country-to"
                    className={styles.select}
                    value={countryTo}
                    onChange={(e) => setCountryTo(e.target.value)}
                  >
                    {DESTINATION_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="operator">
                      {m.form.operator}
                    </label>
                  </div>
                  <select
                    id="operator"
                    className={styles.select}
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    aria-invalid={!operatorId && !!formError}
                  >
                    <option value="">{m.form.operatorPlaceholder}</option>
                    {operatorChoices.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="phone">
                      {m.form.phone}
                    </label>
                    <span className={styles.hint}>{m.form.phoneHint}</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    className={styles.input}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+971 50 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={!isPhonePlausible(digits) && phone.length > 0}
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>{m.form.bundleOrAmount}</span>
                    <span className={styles.hint}>{m.form.bundleOrAmountHint}</span>
                  </div>
                  {priceOptions.length === 0 ? (
                    <p className={styles.hint}>{m.form.selectOperatorForPrices}</p>
                  ) : (
                    <div
                      className={styles.chipRow}
                      role="group"
                      aria-label={m.form.bundleOrAmount}
                    >
                      {priceOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={
                            selectedOptionId === p.id
                              ? `${styles.chip} ${styles.chipActive}`
                              : styles.chip
                          }
                          onClick={() => setSelectedOptionId(p.id)}
                        >
                          {p.label}
                          {p.detail ? (
                            <span className={styles.optionMeta}>{p.detail}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formError && (
                  <p className={styles.fieldError} role="alert">
                    {formError}
                  </p>
                )}

                {showContinue && (
                  <div className={styles.continueRow}>
                    <button
                      type="button"
                      className={styles.ctaPrimary}
                      disabled={busyIntent || !formValid}
                      onClick={startPayment}
                    >
                      {busyIntent ? m.form.continuing : m.form.continueCta}
                    </button>
                  </div>
                )}
              </article>
            </div>

            <aside className={`${styles.aside} ${styles.asideSticky}`}>
              <article className={styles.card} aria-labelledby="summary-title">
                <div className={styles.cardHeader}>
                  <h2 id="summary-title" className={styles.cardTitle}>
                    {m.summary.title}
                  </h2>
                </div>
                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{m.summary.route}</span>
                    <span className={styles.summaryVal}>
                      {fromLabel} → {toLabel}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>
                      {m.summary.product}
                    </span>
                    <span className={styles.summaryVal}>
                      {productLabel(productType, m)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{m.summary.plan}</span>
                    <span className={styles.summaryVal}>{planSummaryLabel}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>
                      {m.summary.operator}
                    </span>
                    <span className={styles.summaryVal}>{opSummaryLabel}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>
                      {m.summary.recipient}
                    </span>
                    <span className={styles.summaryVal}>{maskedRecipient}</span>
                  </div>
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>
                      {m.summary.subtotal}
                    </span>
                    <span className={styles.summaryVal}>{summaryMoney}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{m.summary.fees}</span>
                    <span className={styles.summaryVal}>
                      {m.summary.feesIncluded}
                    </span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span className={styles.summaryKey}>{m.summary.total}</span>
                    <span className={styles.totalAmount}>{summaryMoney}</span>
                  </div>
                </div>
              </article>

              <article className={styles.card} aria-labelledby="pay-title">
                <div className={styles.secureHeader}>
                  <div>
                    <h2 id="pay-title" className={styles.cardTitle}>
                      {m.payment.title}
                    </h2>
                    <p className={styles.cardSubtitle}>{m.payment.subtitle}</p>
                  </div>
                  <div className={styles.secureBadges}>
                    <span className={styles.secureBadge}>
                      {m.payment.badgeLock}
                    </span>
                    <span className={styles.secureBadge}>
                      {m.payment.badgeStripe}
                    </span>
                  </div>
                </div>

                {showStripe ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#10b981',
                          borderRadius: '10px',
                          fontFamily: 'var(--font-sans), system-ui, sans-serif',
                        },
                      },
                    }}
                  >
                    <PaymentConfirmForm
                      payButtonLabel={`${m.payment.payWithAmount} ${formatUsd(amountCents, locale)}`}
                      processingLabel={m.payment.processing}
                      onSuccess={finalizePaidOrder}
                      onError={(msg) => setErrorMessage(msg)}
                    />
                  </Elements>
                ) : (
                  <div className={styles.stripePlaceholder}>
                    {step === 'loading_intent'
                      ? m.form.continuing
                      : m.payment.subtitle}
                  </div>
                )}
              </article>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
