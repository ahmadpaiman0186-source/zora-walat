'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import type { PublicTopupOrder } from '@/topup/publicTopupOrder';
import { getOrCreateCheckoutSessionKey } from '@/topup/checkoutSession';

import { CHECKOUT_FETCH_TIMEOUT_MS, fetchWithTimeout } from './apiFetch';
import {
  classifyTopupPaymentStatus,
  maskPublicRef,
  readSearchParam,
} from './checkoutReturnUtils';
import { useLocale } from '@/components/i18n/LocaleContext';

import { CheckoutReturnLayout } from './CheckoutReturnLayout';
import styles from './CheckoutReturnLayout.module.css';

type LoadPhase = 'idle' | 'loading' | 'ready' | 'unavailable';

export function CheckoutSuccessReturnPage() {
  const { messages: m } = useLocale();
  const searchParams = useSearchParams();
  const orderIdParam = readSearchParam(searchParams.get('order_id') ?? undefined);
  const hasStripeReturnParams =
    Boolean(readSearchParam(searchParams.get('session_id') ?? undefined)) &&
    Boolean(orderIdParam);

  const [phase, setPhase] = useState<LoadPhase>('idle');
  const [matched, setMatched] = useState<PublicTopupOrder | null>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

  const loadStatus = useCallback(async () => {
    setPhase('loading');
    if (!apiBase || !orderIdParam) {
      setMatched(null);
      setPhase('ready');
      return;
    }
    const sessionKey = getOrCreateCheckoutSessionKey();
    if (!sessionKey) {
      setMatched(null);
      setPhase('ready');
      return;
    }
    try {
      const res = await fetchWithTimeout(
        `${apiBase}/api/topup-orders?sessionKey=${encodeURIComponent(sessionKey)}&limit=30`,
        { method: 'GET' },
        CHECKOUT_FETCH_TIMEOUT_MS,
      );
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMatched(null);
        setPhase('unavailable');
        return;
      }
      const list =
        typeof data === 'object' &&
        data !== null &&
        'orders' in data &&
        Array.isArray((data as { orders: unknown }).orders)
          ? (data as { orders: PublicTopupOrder[] }).orders
          : [];
      const hit =
        list.find((o) => o.id === orderIdParam) ??
        list.find((o) => orderIdParam && o.id.endsWith(orderIdParam.slice(-12))) ??
        null;
      setMatched(hit);
      setPhase('ready');
    } catch {
      setMatched(null);
      setPhase('unavailable');
    }
  }, [apiBase, orderIdParam]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const paymentPhase = classifyTopupPaymentStatus(matched?.paymentStatus);
  const refSuffix = maskPublicRef(matched?.id ?? orderIdParam);

  let title = m.returnSuccess.titleUnknown;
  let lead = m.returnSuccess.leadUnknown;
  let cardTone: 'success' | 'warn' | 'neutral' = 'warn';
  let statusLabel = m.returnSuccess.statusVerifying;
  let statusTone: 'verifying' | 'ok' | 'muted' = 'verifying';

  if (!hasStripeReturnParams) {
    lead = m.returnSuccess.leadNoParams;
  } else if (phase === 'unavailable') {
    lead = m.returnSuccess.leadVerifying;
    statusLabel = m.returnSuccess.statusUnavailable;
    statusTone = 'muted';
  } else if (phase === 'loading' || phase === 'idle') {
    lead = m.returnSuccess.leadVerifying;
    statusLabel = m.returnSuccess.statusVerifying;
    statusTone = 'verifying';
  } else if (paymentPhase === 'confirmed') {
    title = m.returnSuccess.titleConfirmed;
    lead = m.returnSuccess.leadConfirmed;
    cardTone = 'success';
    statusLabel = m.returnSuccess.statusConfirmed;
    statusTone = 'ok';
  } else if (paymentPhase === 'pending') {
    title = m.returnSuccess.titleVerifying;
    lead = m.returnSuccess.leadVerifying;
    statusLabel = m.returnSuccess.statusPending;
    statusTone = 'verifying';
  } else if (paymentPhase === 'failed') {
    title = m.returnSuccess.titleVerifying;
    lead = m.returnSuccess.delayBody;
    statusLabel = m.returnSuccess.statusFailed;
    statusTone = 'muted';
  } else {
    title = m.returnSuccess.titleVerifying;
    lead = m.returnSuccess.leadVerifying;
  }

  const actions = (
    <>
      <Link href="/" className={styles.btnPrimary}>
        {m.returnSuccess.ctaHome}
      </Link>
      <Link href="/history" className={styles.btnSecondary}>
        {m.returnSuccess.ctaHistory}
      </Link>
      <button
        type="button"
        className={styles.btnSecondary}
        disabled={phase === 'loading'}
        onClick={() => void loadStatus()}
      >
        {m.returnSuccess.ctaRefresh}
      </button>
    </>
  );

  return (
    <CheckoutReturnLayout
      title={title}
      lead={lead}
      cardTone={cardTone}
      statusPill={{ label: statusLabel, tone: statusTone }}
      actions={actions}
      footerNote={m.returnSuccess.supportNote}
    >
      <p className={styles.note}>
        <span className={styles.noteStrong}>{m.returnSuccess.noServiceNote}</span>
      </p>

      {refSuffix ? (
        <p className={styles.refRow}>
          {m.returnSuccess.refLabel}:{' '}
          <span className={styles.refValue}>{refSuffix}</span>
        </p>
      ) : null}

      <div className={`${styles.alert} ${styles.alertWarn}`} role="note">
        <strong>{m.returnSuccess.duplicateTitle}</strong>
        <p className={styles.note} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          {m.returnSuccess.duplicateBody}
        </p>
      </div>

      <h2 className={styles.noteStrong} style={{ fontSize: '0.95rem', marginTop: '1rem' }}>
        {m.returnSuccess.delayTitle}
      </h2>
      <p className={styles.note}>{m.returnSuccess.delayBody}</p>
    </CheckoutReturnLayout>
  );
}
