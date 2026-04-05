import type { UiMessages } from './en';
import { en } from './en';

/**
 * Turkish — scaffold; expand translations incrementally.
 */
export const tr: UiMessages = {
  ...en,
  brand: {
    ...en.brand,
    badge: 'Küresel telekom · Kontör, internet ve arama',
  },
  hero: {
    ...en.hero,
    subline:
      'Yurt dışından güvenli ödeme ile çok ülkeli mobil yükleme.',
    statCoverage: 'Çok ülkeli katalog',
    routeFootnote: 'Katalog rotası (önizleme)',
  },
  form: {
    ...en.form,
    title: 'Ürün ve alıcı',
    countryFrom: 'Gönderen ülke',
    countryTo: 'Alıcı ülke',
    operator: 'GSM operatörü',
    operatorPlaceholder: 'Operatör seçin',
    phone: 'Cep numarası',
    continueCta: 'Güvenli ödemeye devam',
    continuing: 'Hazırlanıyor…',
    validationPhone: 'Geçerli bir numara girin.',
    validationOperator: 'Bir operatör seçin.',
  },
  summary: {
    ...en.summary,
    title: 'Özet',
    route: 'Güzergâh',
    operator: 'Operatör',
    recipient: 'Alıcı',
    total: 'Toplam',
  },
  success: {
    ...en.success,
    title: 'Ödeme başarılı',
    again: 'Yeni yükleme',
  },
};
