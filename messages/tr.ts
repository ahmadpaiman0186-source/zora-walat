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
  header: {
    ...en.header,
    trustRibbon: 'Güvenli ödeme · Stripe',
  },
  hero: {
    ...en.hero,
    subline:
      'Stripe ile güvenli ödeme — çok ülkeli mobil yükleme.',
    statCoverage: 'Çok ülkeli katalog',
    routeFootnote: 'Katalog rotası · Teslimattan önce ödeme doğrulaması',
  },
  form: {
    ...en.form,
    title: 'Ürün ve alıcı',
    subtitle:
      'Ürün, operatör ve tutarı seçin. Ödemeden önce toplamı gözden geçirirsiniz.',
    countryFrom: 'Gönderen ülke',
    countryTo: 'Alıcı ülke',
    operator: 'GSM operatörü',
    operatorPlaceholder: 'Operatör seçin',
    phone: 'Cep numarası',
    continueCta: 'Stripe Checkout\'a devam',
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
