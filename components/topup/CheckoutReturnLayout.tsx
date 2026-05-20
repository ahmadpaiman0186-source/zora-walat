'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLocale } from '@/components/i18n/LocaleContext';
import { isStagingPreviewApp } from '@/lib/env/publicRuntime';

import styles from './CheckoutReturnLayout.module.css';

type CardTone = 'success' | 'warn' | 'neutral';

type Props = {
  title: string;
  lead: string;
  cardTone?: CardTone;
  statusPill?: { label: string; tone: 'verifying' | 'ok' | 'muted' };
  children?: ReactNode;
  actions: ReactNode;
  footerNote?: string;
};

export function CheckoutReturnLayout({
  title,
  lead,
  cardTone = 'neutral',
  statusPill,
  children,
  actions,
  footerNote,
}: Props) {
  const { messages: m } = useLocale();
  const showStaging = isStagingPreviewApp();

  const cardClass =
    cardTone === 'success'
      ? `${styles.card} ${styles.cardSuccess}`
      : cardTone === 'warn'
        ? `${styles.card} ${styles.cardWarn}`
        : styles.card;

  const pillClass =
    statusPill?.tone === 'ok'
      ? `${styles.statusPill} ${styles.pillOk}`
      : statusPill?.tone === 'verifying'
        ? `${styles.statusPill} ${styles.pillVerifying}`
        : `${styles.statusPill} ${styles.pillMuted}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brandLink}>
          ← {m.brand.name}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {showStaging ? (
            <span className={styles.stagingBadge}>{m.header.stagingBadge}</span>
          ) : null}
          <LanguageSwitcher />
        </div>
      </header>

      <article className={cardClass}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
        {statusPill ? (
          <p className={pillClass} role="status">
            {statusPill.label}
          </p>
        ) : null}
        {children}
        <div className={styles.actions}>{actions}</div>
      </article>

      {footerNote ? <p className={styles.muted}>{footerNote}</p> : null}
    </div>
  );
}
