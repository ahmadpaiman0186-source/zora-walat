'use client';

import Link from 'next/link';

import { useLocale } from '@/components/i18n/LocaleContext';

import { CheckoutReturnLayout } from './CheckoutReturnLayout';
import styles from './CheckoutReturnLayout.module.css';

export function CheckoutCancelReturnPage() {
  const { messages: m } = useLocale();

  const actions = (
    <>
      <Link href="/" className={styles.btnPrimary}>
        {m.returnCancel.ctaHome}
      </Link>
      <Link href="/history" className={styles.btnSecondary}>
        {m.returnCancel.ctaHistory}
      </Link>
    </>
  );

  return (
    <CheckoutReturnLayout
      title={m.returnCancel.title}
      lead={m.returnCancel.lead}
      cardTone="neutral"
      statusPill={{ label: m.returnCancel.noCharge, tone: 'muted' }}
      actions={actions}
      footerNote={m.returnCancel.supportNote}
    >
      <p className={styles.note}>
        <span className={styles.noteStrong}>{m.returnCancel.noService}</span>
      </p>
      <p className={styles.note}>{m.returnCancel.retryNote}</p>

      <div className={`${styles.alert} ${styles.alertWarn}`} role="note">
        <p className={styles.note} style={{ margin: 0 }}>
          {m.returnCancel.abuseNote}
        </p>
      </div>
    </CheckoutReturnLayout>
  );
}
