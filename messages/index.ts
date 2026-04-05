import { ar } from './ar';
import { en, type UiMessages } from './en';
import { fa } from './fa';
import { tr } from './tr';

export type UiLocale = 'en' | 'fa' | 'ar' | 'tr';

const catalogs: Record<UiLocale, UiMessages> = {
  en,
  fa,
  ar,
  tr,
};

export function getUiMessages(locale: UiLocale = 'en'): UiMessages {
  return catalogs[locale];
}

export type { UiMessages };
