import type { UiMessages } from './en';
import { en } from './en';

/**
 * Turkish — returnSuccess/returnCancel and nav fully localized.
 */
export const tr: UiMessages = {
  ...en,
  brand: {
    ...en.brand,
    badge: 'Küresel telekom · Kontör, internet ve arama',
  },
  header: {
    ...en.header,
    navHowItWorks: 'Nasıl çalışır',
    navSupport: 'Destek rehberi',
    navOrderHistory: 'Siparişler',
    trustRibbon: 'Güvenli ödeme · Stripe',
  },
  hero: {
    ...en.hero,
    subline:
      'Stripe ile güvenli ödeme — çok ülkeli mobil yükleme.',
    statInstant: 'Durum takibiyle yükleme',
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
    continueCta: 'Güvenli ödemeye devam',
    continuing: 'Hazırlanıyor…',
    validationPhone: 'Geçerli bir numara girin.',
    validationOperator: 'Bir operatör seçin.',
    validationStripe: 'Ödeme kurulumu eksik. Devam ederse destekle iletişime geçin.',
  },
  trust: {
    ...en.trust,
    title: 'Ödemeleri nasıl güvende tutuyoruz',
    stripe: 'Ödeme Stripe ile — endüstri standardı kart işleme.',
    verify: 'Teslimattan önce ödeme onayı doğrulanır.',
    tracking: 'İade ve teslimat durumları yinelenen teslimat riskini azaltmak için izlenir.',
    noStore: 'Tam kart numaranız sunucularımızda saklanmaz.',
  },
  support: {
    title: 'Destek rehberi',
    body:
      'Önce son siparişlerden ödeme ve teslimat durumunu kontrol edin. Gerekirse sipariş referansı son eki ve ödeme zamanıyla destek kanalınıza başvurun.',
    ctaHistory: 'Son siparişleri görüntüle',
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
  history: {
    ...en.history,
    title: 'Son siparişler',
    subtitle: 'Bu oturumdaki siparişler. Tüm cihazlarda geçmiş için giriş yapın.',
    empty: 'Henüz sipariş yok — yükleme tamamlayınca burada görünür.',
    refresh: 'Yenile',
  },
  returnSuccess: {
    titleVerifying: 'Ödemeniz doğrulanıyor',
    titleConfirmed: 'Ödeme sunucularımızda onaylandı',
    titleUnknown: 'Ödeme dönüşü alındı',
    leadVerifying:
      'Stripe Checkout tarafınızda tamamlandı. Yükleme teslim edilmeden önce ödemeyi sunucularımızda onaylıyoruz.',
    leadConfirmed:
      'Ödemeniz sunucularda kaydedildi. Teslimat yalnızca bu onaydan sonra başlar — yalnızca bu sayfadan değil.',
    leadUnknown:
      'Az önce ödediyseniz onay biraz sürebilir. Destek söylemedikçe yeni ödeme başlatmayın.',
    leadNoParams:
      'Bu sayfa Stripe Checkout’tan açıldığında en iyi çalışır. Ödediyseniz kısa bekleyin ve siparişlere bakın.',
    statusVerifying: 'Doğrulama sürüyor',
    statusConfirmed: 'Sunucu ödeme durumu: onaylandı',
    statusPending: 'Sunucu ödeme durumu: hâlâ bekliyor',
    statusFailed: 'Sunucu ödeme durumu: tamamlanmadı',
    statusUnavailable: 'Ödeme servisinden sipariş durumu yüklenemedi.',
    refLabel: 'Sipariş referansı',
    duplicateTitle: 'Yinelenen ödemelerden kaçının',
    duplicateBody:
      'Bu sayfayı tekrar tekrar yenilemeyin ve destek istemedikçe aynı yükleme için yeni ödeme göndermeyin. Yinelenen ödemeler gecikme ve manuel incelemeye yol açabilir.',
    delayTitle: 'Beklenenden uzun mu sürüyor?',
    delayBody:
      'Banka veya Stripe onayı kısa sürebilir. Sunucular siparişi ödendi olarak işaretlemeden yükleme teslim edilmez. Son siparişlere bakın veya referans son ekiyle destekle iletişime geçin.',
    noServiceNote:
      'Yalnızca bu sayfadan kontör veya veri gönderilmez. Hizmet sunucu onaylı ödeme gerektirir.',
    ctaHome: 'Yüklemeye dön',
    ctaHistory: 'Son siparişleri görüntüle',
    ctaRefresh: 'Durumu tekrar kontrol et',
    supportNote:
      'Doğrulama gecikirse sipariş referansı son eki ve ödeme zamanıyla destekle iletişime geçin.',
  },
  returnCancel: {
    title: 'Ödeme tamamlanmadı',
    lead: 'Ödeme bitmeden Stripe Checkout’tan ayrıldınız veya bankanız tahsilatı tamamlamadı.',
    noCharge: 'Bu ödeme denemesi için tahsilat yapılmadı.',
    noService:
      'Yükleme gönderilmedi. Hizmet yalnızca sunucularımız ödemeyi onayladıktan sonra verilir.',
    abuseNote:
      'Tekrar denerken her seferinde tek bir ödeme kullanın. Ödenmemiş tekrarlar hizmet vermez ve kötüye kullanım korumasıyla sınırlanabilir.',
    retryNote:
      'Hazır olduğunuzda ana sayfadan yeni yükleme başlatın. Bu sayfadan otomatik yeniden deneme veya kart tahsilatı yapılmaz.',
    ctaHome: 'Yeni yükleme başlat',
    ctaHistory: 'Son siparişleri görüntüle',
    supportNote:
      'Bu sayfayı görmenize rağmen tahsilat olduğunu düşünüyorsanız destekle iletişime geçin — doğrulanana kadar yeni ödeme göndermeyin.',
  },
  error: {
    ...en.error,
    configApi: 'Ödeme servisi bu dağıtımda kullanılamıyor. Devam ederse destekle iletişime geçin.',
    network: 'Ödeme servisi geçici olarak kullanılamıyor. Kısa süre sonra tekrar deneyin.',
  },
};
