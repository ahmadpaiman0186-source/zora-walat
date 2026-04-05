'use client';

import type { UiLocale } from '@/messages';

import { useLocale } from './localeContext';
import styles from './LanguageSwitcher.module.css';

const ORDER: UiLocale[] = ['en', 'fa', 'ar', 'tr'];

/** Native / short labels for the switcher scaffold. */
const LABELS: Record<UiLocale, string> = {
  en: 'EN',
  fa: 'فا',
  ar: 'عر',
  tr: 'TR',
};

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useLocale();

  return (
    <div
      className={styles.wrap}
      role="group"
      aria-label={messages.lang.ariaLabel}
    >
      {ORDER.map((code) => (
        <button
          key={code}
          type="button"
          className={
            locale === code ? `${styles.btn} ${styles.btnActive}` : styles.btn
          }
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          title={messages.lang.names[code]}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
