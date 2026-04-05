'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLocale } from '@/components/i18n/localeContext';
import type { PublicTopupOrder } from '@/topup/publicTopupOrder';
import { getOrCreateCheckoutSessionKey } from '@/topup/checkoutSession';

import styles from './OrderHistoryPage.module.css';

const defaultApiBase = 'http://127.0.0.1:8787';

export function OrderHistoryPage() {
  const { messages: m, locale } = useLocale();
  const [orders, setOrders] = useState<PublicTopupOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? defaultApiBase
  ).replace(/\/+$/, '');

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const sessionKey = getOrCreateCheckoutSessionKey();
    if (!sessionKey) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${apiBase}/api/topup-orders?sessionKey=${encodeURIComponent(sessionKey)}&limit=30`,
      );
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(m.history.loadError);
        setOrders([]);
        return;
      }
      const list =
        typeof data === 'object' &&
        data !== null &&
        'orders' in data &&
        Array.isArray((data as { orders: unknown }).orders)
          ? (data as { orders: PublicTopupOrder[] }).orders
          : [];
      setOrders(list);
    } catch {
      setErr(m.history.loadError);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, m.history.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatMoney = (cents: number) =>
    (cents / 100).toLocaleString(
      locale === 'tr' ? 'tr-TR' : locale === 'ar' ? 'ar' : 'en-US',
      { style: 'currency', currency: 'USD' },
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← {m.brand.name}
        </Link>
        <LanguageSwitcher />
      </header>

      <h1 className={styles.title}>{m.history.title}</h1>
      <p className={styles.sub}>{m.history.subtitle}</p>

      {loading ? (
        <p className={styles.muted}>{m.form.continuing}</p>
      ) : err ? (
        <p className={styles.error} role="alert">
          {err}
        </p>
      ) : orders && orders.length === 0 ? (
        <p className={styles.muted}>{m.history.empty}</p>
      ) : (
        <ul className={styles.list}>
          {orders?.map((o) => (
            <li key={o.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.badge}>{o.id}</span>
                <span className={styles.amount}>{formatMoney(o.amountCents)}</span>
              </div>
              <div className={styles.meta}>
                {o.originCountry}→{o.destinationCountry} · {o.productType} ·{' '}
                {o.operatorLabel}
              </div>
              <div className={styles.status}>
                {o.paymentStatus} · {o.fulfillmentStatus}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className={styles.reload} onClick={() => void load()}>
        {m.history.refresh}
      </button>
    </div>
  );
}
