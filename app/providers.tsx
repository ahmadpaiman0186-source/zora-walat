'use client';

import { LocaleProvider } from '@/components/i18n/LocaleContext';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
