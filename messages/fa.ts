import type { UiMessages } from './en';
import { en } from './en';

/**
 * Persian — scaffold: critical strings translated; remainder falls back via spread of `en`.
 * Expand file over time; RTL is applied for `fa` in `LocaleProvider`.
 */
export const fa: UiMessages = {
  ...en,
  brand: {
    ...en.brand,
    badge: 'مخابرات بین‌المللی · شارژ، اینترنت و تماس',
  },
  header: {
    ...en.header,
    trustRibbon: 'پرداخت امن · Stripe',
  },
  hero: {
    ...en.hero,
    subline:
      'شارژ موبایل بین‌المللی با پرداخت امن Stripe — برای خانواده‌ها و جامعه‌هایی که با افغانستان و منطقه در تماس می‌مانند.',
    statCoverage: 'کاتالوگ چندکشور',
    routeFootnote: 'مسیر کاتالوگ · تأیید پرداخت پیش از تحویل',
  },
  form: {
    ...en.form,
    title: 'محصول و گیرنده',
    subtitle: 'نوع محصول، اپراتور و مبلغ را انتخاب کنید. قبل از پرداخت مجموع را بررسی می‌کنید.',
    countryFrom: 'ارسال از',
    countryTo: 'دریافت در',
    operator: 'اپراتور موبایل',
    operatorPlaceholder: 'اپراتور را انتخاب کنید',
    phone: 'شماره موبایل',
    phoneHint: 'شماره محلی',
    continueCta: 'ادامه به پرداخت امن',
    continuing: 'در حال آماده‌سازی…',
    validationPhone: 'شماره معتبر وارد کنید.',
    validationOperator: 'یک اپراتور انتخاب کنید.',
  },
  summary: {
    ...en.summary,
    title: 'خلاصه پرداخت',
    route: 'مسیر',
    operator: 'اپراتور',
    recipient: 'گیرنده',
    total: 'مبلغ کل',
  },
  success: {
    ...en.success,
    title: 'پرداخت موفق',
    again: 'شارژ دیگر',
  },
};
