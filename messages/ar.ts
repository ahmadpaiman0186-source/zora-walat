import type { UiMessages } from './en';
import { en } from './en';

/**
 * Arabic — scaffold for RTL + future copy. Many strings still English via spread.
 */
export const ar: UiMessages = {
  ...en,
  brand: {
    ...en.brand,
    badge: 'اتصالات عالمية · رصيد وبيانات ومكالمات',
  },
  hero: {
    ...en.hero,
    subline:
      'شحن الجوال متعدد الدول مع دفع آمن — للجاليات والمسافرين.',
    statCoverage: 'كتالوج متعدد الدول',
    routeFootnote: 'مسار الكتالوج (تجريبي)',
  },
  form: {
    ...en.form,
    title: 'المنتج والمستلم',
    subtitle: 'اختر المنتج والمزود والمبلغ (وضع تجريبي).',
    countryFrom: 'الإرسال من',
    countryTo: 'الاستلام في',
    operator: 'مشغّل الجوال',
    operatorPlaceholder: 'اختر المزود',
    phone: 'رقم الجوال',
    phoneHint: 'رقم محلي',
    continueCta: 'المتابعة للدفع الآمن',
    continuing: 'جاري التجهيز…',
    validationPhone: 'أدخل رقمًا صالحًا.',
    validationOperator: 'اختر مزودًا.',
  },
  summary: {
    ...en.summary,
    title: 'ملخص الدفع',
    route: 'المسار',
    operator: 'المزود',
    recipient: 'المستلم',
    total: 'الإجمالي',
  },
  success: {
    ...en.success,
    title: 'تم الدفع بنجاح',
    again: 'شحن جديد',
  },
};
