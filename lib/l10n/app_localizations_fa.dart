// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Persian (`fa`).
class AppLocalizationsFa extends AppLocalizations {
  AppLocalizationsFa([String locale = 'fa']) : super(locale);

  @override
  String get appTitle => 'زوره‌ولت';

  @override
  String get language => 'زبان';

  @override
  String get languageEnglish => 'انگلیسی';

  @override
  String get languageDari => 'دری';

  @override
  String get languagePashto => 'پښتو';

  @override
  String get chooseLanguageTitle => 'انتخاب زبان';

  @override
  String get splashTagline =>
      'شارژ موبایل افغانستان از خارج. امن، شفاف و سریع.';

  @override
  String get languageOnboardingSubtitle =>
      'هر زمان می‌توانید از منوی زبان تغییر دهید.';

  @override
  String get selectAmount => 'مبلغ (دلار آمریکا)';

  @override
  String get continueCta => 'ادامه';

  @override
  String get rechargeReviewTitle => 'بررسی';

  @override
  String get rechargeReviewSubtitle =>
      'قبل از انتخاب بسته، این موارد را تأیید کنید.';

  @override
  String get rechargeReviewServerPricingNote =>
      'فقط ایرتیم. مبلغ نهایی به دلار هنگام شروع checkout روی سرور قفل می‌شود — پرداخت در صفحهٔ امن Stripe انجام می‌شود.';

  @override
  String get continueToPlans => 'ادامه به تعرفه‌ها';

  @override
  String get rechargeReviewStripeHint =>
      'با Apple Pay / Google Pay یا کارت بپردازید. اطلاعات کارت روی سرورهای ما ذخیره نمی‌شود.';

  @override
  String paymentPayWithCard(String amount) {
    return 'پرداخت $amount';
  }

  @override
  String get paymentPreparing => 'در حال آماده‌سازی پرداخت امن…';

  @override
  String get paymentSuccessTitle => 'پرداخت موفق';

  @override
  String get paymentSuccessBody =>
      'از Stripe برگشتید. این صفحه فقط برای راحتی شماست — تأیید نهایی پرداخت روی سرورهای ما انجام می‌شود. تحویل اپراتور پس از تأیید انجام می‌شود.';

  @override
  String get paymentFailedTitle => 'پرداخت ناموفق';

  @override
  String get paymentCancelledTitle => 'پرداخت لغو شد';

  @override
  String get paymentCancelledBody =>
      'هیچ مبلقی کسر نشد. هر زمان بخواهید دوباره تلاش کنید.';

  @override
  String get paymentCheckoutRedirectTitle => 'پرداخت Stripe';

  @override
  String get paymentCheckoutRedirectBody =>
      'پرداخت را در صفحهٔ بعد تکمیل کنید. پس از بازگشت، تأیید ممکن است کمی طول بکشد.';

  @override
  String get paymentTryAgain => 'تلاش دوباره';

  @override
  String get paymentBackToReview => 'ویرایش جزئیات';

  @override
  String get languageSheetSubtitle =>
      'انگلیسی، دری و پښتو به‌طور کامل پشتیبانی می‌شوند.';

  @override
  String get done => 'تأیید';

  @override
  String get cancel => 'لغو';

  @override
  String get help => 'راهنما';

  @override
  String get refresh => 'تازه‌سازی';

  @override
  String get wallet => 'کیف پول';

  @override
  String get more => 'بیشتر';

  @override
  String get loading => 'در حال بارگذاری…';

  @override
  String get processing => 'در حال پردازش…';

  @override
  String get rechargeTitle => 'شارژ موبایل';

  @override
  String get rechargeHero =>
      'اعتبار موبایل (ایرتیم) را به شماره‌های افغانستان به دلار بفرستید. سریع، شفاف و قابل اعتماد برای کسانی که از آمریکا، کانادا، بریتانیا، اروپا، امارات یا ترکیه شارژ می‌کنند.';

  @override
  String get phase1OnlyAirtimeSnack =>
      'فاز ۱: فقط شارژ ایرتیم موبایل در دسترس است.';

  @override
  String get phase1UsdSecureCheckout =>
      'پرداخت به دلار در صفحهٔ امن Stripe انجام می‌شود. مبلغ نهایی قبل از برداشت از سرور ما تأیید می‌شود.';

  @override
  String get checkoutCardRegionLabel => 'موقعیت شما (کارت)';

  @override
  String get checkoutSenderCountryHint =>
      'این منطقهٔ صدور کارت شما برای بررسی ریسک است؛ شمارهٔ گیرنده همیشه موبایل افغانستان (+۹۳) است.';

  @override
  String get telecomRecipientAfghanistanDialHint =>
      'افغانستان +۹۳ — شمارهٔ محلی موبایل را وارد کنید (با ۷ شروع می‌شود).';

  @override
  String get checkoutPricingUsdServerNote =>
      'قیمت‌گذاری به دلار روی سرورهای ما برای منطقهٔ شما محاسبه می‌شود.';

  @override
  String get telecomCheckoutAirtimeRowLabel => 'اعتبار موبایل (ایرتیم)';

  @override
  String get phase1ValidityDependsOnOperator =>
      'مدت اعتبار بسته به اپراتور است — فقط وقتی مقدار تأییدشده از قیمت‌گذاری داریم اینجا نشان می‌دهیم.';

  @override
  String checkoutAirtimeAmountLine(String amount) {
    return 'ارسال $amount ایرتیم';
  }

  @override
  String checkoutReviewTotalChargedHeadline(String amount) {
    return 'Total charged: $amount';
  }

  @override
  String checkoutReviewAirtimeValueSubline(String amount) {
    return 'Airtime value (recipient): $amount';
  }

  @override
  String get checkoutReviewHeadlinePricingUnavailable =>
      'Full pricing will appear when the quote loads — check the order summary below.';

  @override
  String get checkoutQuoteFailed =>
      'We couldn\'t load pricing. Check your connection and try again.';

  @override
  String get checkoutAirtimeValueLabel => 'Airtime value';

  @override
  String get receiptBreakdownLoadingHint => 'Loading payment breakdown…';

  @override
  String get receiptBreakdownPartialHint =>
      'Full line-item breakdown was not available; amount below is the total charged to your card.';

  @override
  String get rechargeTrustLine =>
      'قیمت‌گذاری دلاری · پرداخت امن · موبایل افغانستان';

  @override
  String get recipientNumber => 'شمارهٔ گیرنده';

  @override
  String get receivingCountryLabel => 'کشور گیرنده';

  @override
  String get rechargeCountryNotSupported =>
      'شارژ موبایل فقط برای شماره‌های افغانستان است. افغانستان را انتخاب کنید.';

  @override
  String get phoneLocalDigitsHint => 'شمارهٔ محلی را بدون کد کشور وارد کنید.';

  @override
  String get operator => 'اپراتور';

  @override
  String get getPackages => 'دریافت بسته‌ها';

  @override
  String get packages => 'بسته‌ها';

  @override
  String packageOptionsCount(int count) {
    return '$count گزینه';
  }

  @override
  String get enterRecipientError => 'شمارهٔ گیرنده را وارد کنید.';

  @override
  String get noPackagesForOperator =>
      'فعلاً برای این اپراتور بسته‌ای موجود نیست.';

  @override
  String get orderPlacedDefault => 'سفارش ثبت شد';

  @override
  String confirmMockSnack(String label) {
    return '$label · تأیید شد';
  }

  @override
  String get tapGetPackagesHint =>
      '«دریافت بسته‌ها» را بزنید تا پیشنهادهای زنده برای این شماره بار شود.';

  @override
  String get airtimeLabel => 'اعتبار';

  @override
  String get dataBundleLabel => 'بستهٔ اینترنت';

  @override
  String get amountLabel => 'مقدار';

  @override
  String get priceLabel => 'قیمت';

  @override
  String get buyLabel => 'خرید';

  @override
  String get apiUnreachableRecharge =>
      'اتصال برقرار نشد. اتصال اینترنت را بررسی کرده و دوباره تلاش کنید.';

  @override
  String get hubSubtitle => 'شارژ · کیف پول · تماس';

  @override
  String get hubTileRechargeTitle => 'شارژ موبایل';

  @override
  String get hubTileRechargeSub => 'بسته‌های فوری · قیمت به دلار';

  @override
  String get hubTileWalletTitle => 'کیف پول';

  @override
  String get hubTileWalletSub => 'موجودی و شارژ';

  @override
  String get hubTileCallingTitle => 'تماس بین‌الملل';

  @override
  String get hubTileCallingSub => 'به‌زودی';

  @override
  String get hubTileLegacyTitle => 'پلن‌ها و کاتالوگ';

  @override
  String get hubTileLegacySub => 'اعتبار و دیتا';

  @override
  String get walletScreenTitle => 'کیف پول';

  @override
  String get balanceHeroLabel => 'موجودی حساب';

  @override
  String get availableLabel => 'موجود';

  @override
  String get quickTopUp => 'شارژ سریع';

  @override
  String get walletTopUpHint =>
      'وجه را به‌صورت امن اضافه کنید؛ برای آزمایش یکپارچگی، اعتبار فوراً اعمال می‌شود.';

  @override
  String topUpSuccessSnack(String amount) {
    return '$amount اضافه شد · موجودی به‌روز شد';
  }

  @override
  String get apiUnreachableWallet =>
      'اتصال برقرار نشد. اتصال اینترنت را بررسی کرده و دوباره تلاش کنید.';

  @override
  String get telecomHomeSubtitle => 'موبایل افغانستان · پرداخت دلار · امن';

  @override
  String get aboutTitle => 'دربارهٔ زوره‌ولت';

  @override
  String get aboutBody =>
      'قیمت‌ها به دلار نمایش داده می‌شوند. پرداخت کارت به‌صورت امن پردازش می‌شود؛ اعتبار و دیتا از طریق یکپارچگی‌های اپراتور تحویل داده می‌شود.';

  @override
  String get aboutDevHint =>
      'توسعه‌دهندگان: کلید publishable استرایپ را در lib/stripe_keys.dart قرار دهید؛ در صورت نیاز PAYMENTS_API_BASE_URL را در زمان build بدهید.';

  @override
  String get tabAirtime => 'اعتبار';

  @override
  String get tabDataPackages => 'بسته‌های دیتا';

  @override
  String get tabIntlCalling => 'تماس خارجی';

  @override
  String get callingTitle => 'تماس بین‌الملل';

  @override
  String get callingBody =>
      'تماس بین‌الملل را با همان تسویهٔ امن شارژ می‌سازیم.\nبه‌زودی برگردید.';

  @override
  String get missingOrder => 'این سفارش باز نشد. برگردید و دوباره تلاش کنید.';

  @override
  String get paymentCancelled => 'پرداخت لغو شد';

  @override
  String get reviewPayTitle => 'بررسی و پرداخت';

  @override
  String get orderSummary => 'خلاصهٔ سفارش';

  @override
  String get serviceLabel => 'خدمت';

  @override
  String get phoneNumberLabel => 'شماره تلفن';

  @override
  String get operatorLabel => 'اپراتور';

  @override
  String get packageLabel => 'بسته';

  @override
  String get totalUsd => 'جمع (USD)';

  @override
  String get checkoutProductValueLabel => 'Product value';

  @override
  String get checkoutSenderTaxLabel => 'Tax (sender jurisdiction)';

  @override
  String get checkoutServiceFeeLabel => 'Zora-Walat service fee';

  @override
  String get checkoutTotalChargedLabel => 'Total charged';

  @override
  String get checkoutTaxJurisdictionPhaseNote =>
      'Tax on the product value uses your selected sender country. If you add state, city, or ZIP, it is stored for compliance and for future tax engines; it does not change the tax rate in this app version yet.';

  @override
  String get checkoutPricingLoading => 'Updating price for your region…';

  @override
  String get checkoutUsdTotalFootnote =>
      'کسر به USD است. اگر کارت شما USD نیست، بانک ممکن است کارمزد تبدیل اضافه کند؛ تحت کنترل ما نیست.';

  @override
  String get checkoutScreenCurrencyHint => 'Prices in US dollars (USD).';

  @override
  String get checkoutScreenServerPricingNote =>
      'Pricing is calculated in USD on our servers for your region.';

  @override
  String get checkoutScreenOrderTotalCaption => 'Total (USD)';

  @override
  String get checkoutScreenChargeFootnote =>
      'Charged in USD. If your card is not USD, your bank may add conversion or fees we do not control.';

  @override
  String get checkoutScreenStripeSecureNote =>
      'You pay in USD on Stripe’s secure checkout. The total is confirmed by our server before you are charged.';

  @override
  String get stripeSectionTitle => 'پرداخت امن';

  @override
  String get stripeKeyMissing =>
      'کلید publishable Stripe برای این build تنظیم نشده.';

  @override
  String get stripeKeyLoaded =>
      'پرداخت کارت آماده است. سرور شما PaymentIntent می‌سازد و client secret برمی‌گرداند.';

  @override
  String get payWithStripe => 'پرداخت با کارت';

  @override
  String get lineAirtime => 'اعتبار';

  @override
  String get lineDataPackage => 'بستهٔ دیتا';

  @override
  String get lineInternational => 'بین‌الملل';

  @override
  String get telecomAirtimeHeadline => 'شارژ موبایل';

  @override
  String get telecomAirtimeSubtitle =>
      'اعتبار افغان بی‌سیم، ام تی ان، اتصالات یا روشن را شارژ کنید. قیمت به دلار با تسویهٔ امن.';

  @override
  String get telecomSelectOperatorSnack =>
      'شبکه را انتخاب کنید یا شماره‌ای وارد کنید که بشناسیم.';

  @override
  String get telecomChooseAmountSnack => 'برای ادامه یک مقدار انتخاب کنید.';

  @override
  String telecomDetectedOperator(String name) {
    return 'شناسایی شد: $name';
  }

  @override
  String get telecomPrefixUnknown =>
      'پیش‌شماره شناخته نشد — اپراتور را پایین انتخاب کنید.';

  @override
  String get telecomUseAutoDetect => 'تشخیص خودکار';

  @override
  String get telecomMinuteBundlesTitle => 'بسته‌های دقیقه‌ای (USD)';

  @override
  String get telecomEnterNumberForAmounts =>
      'شمارهٔ معتبر وارد کرده و اپراتور را تأیید کنید تا مبالغ نمایش داده شود.';

  @override
  String get telecomPhoneHintAirtime => '07X XXX XXXX یا 937…';

  @override
  String get recipientLocalNumber => 'شماره موبایل محلی';

  @override
  String get phase1AirtimeAfghanistanOnly =>
      'در فاز ۱، شارژ فقط برای افغانستان. افغانستان را انتخاب کنید.';

  @override
  String get checkoutSecuringCheckout => 'در حال ایمن‌سازی پرداخت…';

  @override
  String get telecomDataHeadline => 'بسته‌های دیتا';

  @override
  String get telecomDataSubtitle =>
      'بسته‌های روزانه، هفتگی و ماهانه. همه به دلار.';

  @override
  String get telecomPhoneHintData => '07X XXX XXXX';

  @override
  String get intlTabHeadline => 'تماس بین‌الملل';

  @override
  String get intlTabBody =>
      'به‌زودی: دقیقه‌های جهانی و بسته‌های بین‌الملل با همان تسویهٔ امن کارت.';

  @override
  String get periodDaily => 'روزانه';

  @override
  String get periodWeekly => 'هفتگی';

  @override
  String get periodMonthly => 'ماهانه';

  @override
  String get bestValueBadge => 'بهترین ارزش';

  @override
  String get telecomVoiceBundle => 'صدا';

  @override
  String telecomMarginNote(String pct) {
    return 'حداقل $pct٪ حاشیه';
  }

  @override
  String get phoneValidationEmpty => 'شماره موبایل را وارد کنید.';

  @override
  String get phoneValidationInvalid =>
      'شماره موبایل معتبر افغانستان را وارد کنید.';

  @override
  String get phoneValidationLength => 'پس از ۷ باید ۹ یا ۱۰ رقم باشد.';

  @override
  String get phoneValidationPrefix => 'شماره‌های افغان با ۷ شروع می‌شوند.';

  @override
  String get phoneValidationFormat => 'قالب شماره نامعتبر است.';

  @override
  String get telecomNoDataPackages =>
      'فعلاً بستهٔ دیتایی برای این اپراتور نیست. اپراتور دیگری را امتحان کنید یا بعداً سر بزنید.';

  @override
  String dataVolumeGb(String n) {
    return '$n گیگابایت';
  }

  @override
  String dataVolumeMb(String n) {
    return '$n مگابایت';
  }

  @override
  String get validityOneDay => '۱ روز';

  @override
  String get validity7Days => '۷ روز';

  @override
  String get validity30Days => '۳۰ روز';

  @override
  String validityNDays(String n) {
    return '$n روز';
  }

  @override
  String get currencyUsdHint => 'قیمت‌ها به دلار آمریکا (USD) است.';

  @override
  String get actionRetry => 'تلاش دوباره';

  @override
  String get telecomCatalogLoadError =>
      'گزینه‌ها بار نشد. اتصال را بررسی کرده و «تلاش دوباره» را بزنید.';

  @override
  String get telecomAirtimeEmpty => 'فعلاً مبلغی برای این شبکه موجود نیست.';

  @override
  String get telecomLoadingAmounts => 'در حال بارگذاری مبالغ…';

  @override
  String get checkoutYourOrder => 'سفارش شما';

  @override
  String get checkoutPaymentSecureNote =>
      'پرداخت در صفحهٔ امن Stripe انجام می‌شود. اطلاعات کارت از سرورهای ما عبور نمی‌کند.';

  @override
  String get telecomDataPackagesSectionTitle => 'یک بسته انتخاب کنید';

  @override
  String get telecomDataLoadingPackages => 'در حال بارگذاری بسته‌ها…';

  @override
  String get authSignInTitle => 'ورود';

  @override
  String get authRegisterTitle => 'ایجاد حساب';

  @override
  String get authEmailLabel => 'ایمیل';

  @override
  String get authPasswordLabel => 'رمز عبور';

  @override
  String get authSignInCta => 'ورود';

  @override
  String get authRegisterCta => 'ثبت‌نام';

  @override
  String get authRegisterPasswordHint => 'حداقل ۱۰ نویسه';

  @override
  String get authSwitchToRegister => 'حساب ندارید؟ ثبت‌نام';

  @override
  String get authSwitchToSignIn => 'حساب دارید؟ ورود';

  @override
  String get authRequiredMessage => 'لطفاً برای ادامه وارد شوید.';

  @override
  String get authSignOut => 'خروج';

  @override
  String get authAccountTileTitle => 'حساب';

  @override
  String get authAccountTileSignedInSub => 'وارد شده‌اید';

  @override
  String get authAccountTileSignedOutSub => 'برای کیف پول و پرداخت وارد شوید';

  @override
  String get authGenericError => 'مشکلی پیش آمد. دوباره تلاش کنید.';

  @override
  String get authFillAllFields => 'ایمیل و رمز عبور را وارد کنید.';

  @override
  String get authInvalidEmail => 'یک نشانی ایمیل معتبر وارد کنید.';

  @override
  String get authEmailRequired => 'نشانی ایمیل خود را وارد کنید.';

  @override
  String get authOtpEmailIntro =>
      'نشانی ایمیل خود را وارد کنید تا در صورت واجد شرایط بودن حساب، یک کد ۶ رقمی ورود برای شما ارسال شود.';

  @override
  String get authOtpEmailHelp =>
      'از همان ایمیلی استفاده کنید که برای حساب زوره‌ولت خود دارید.';

  @override
  String get authOtpContinueCta => 'ارسال کد';

  @override
  String get authOtpCodeTitle => 'ورود کد';

  @override
  String get authOtpCheckEmail => 'صندوق ایمیل خود را بررسی کنید';

  @override
  String get authOtpCodeLabel => 'کد تأیید';

  @override
  String get authOtpVerifyCta => 'تأیید کد';

  @override
  String get authOtpCodeRequired => 'کد تأیید ۶ رقمی را وارد کنید.';

  @override
  String get authOtpInvalidOrExpired =>
      'این کد نامعتبر است یا منقضی شده. یک کد تازه درخواست کرده و دوباره تلاش کنید.';

  @override
  String get authOtpTooManyAttempts =>
      'تلاش‌های زیادی انجام شده است. لطفاً کمی صبر کرده و دوباره امتحان کنید.';

  @override
  String get authNetworkRetry =>
      'خطای شبکه. اتصال خود را بررسی کرده و دوباره تلاش کنید.';

  @override
  String get authOtpRequestSuccess =>
      'اگر حساب واجد شرایط باشد، کد تأیید ارسال شده است.';

  @override
  String get authOtpResendReady => 'اکنون می‌توانید یک کد تازه درخواست کنید.';

  @override
  String get authOtpResendCta => 'ارسال دوباره کد';

  @override
  String get authOtpChangeEmail => 'استفاده از ایمیل دیگر';

  @override
  String authOtpCodeHelp(Object email) {
    return 'یک کد ۶ رقمی به $email فرستاده شد. برای ادامه آن را در پایین وارد کنید.';
  }

  @override
  String authOtpResendIn(Object seconds) {
    return 'می‌توانید تا $seconds ثانیه دیگر کد را دوباره بفرستید.';
  }

  @override
  String get landingNavBrand => 'زوره‌ولت';

  @override
  String get landingHeroTitle => 'شارژ افغانستان را در چند ثانیه بفرستید';

  @override
  String get landingHeroSubtitle =>
      'شارژ بین‌المللی برای شماره‌های افغانستان — برای خانواده‌هایی که به راهی سریع و مطمئن برای ارتباط نیاز دارند.';

  @override
  String get landingTrustBadge =>
      'قیمت‌گذاری دلاری · پرداخت امن · ساخته‌شده برای مهاجران';

  @override
  String get landingCtaGetStarted => 'شروع کنید';

  @override
  String get landingCtaSignIn => 'ورود';

  @override
  String get landingLanguagesTitle => 'زبان‌ها';

  @override
  String get landingLanguagesBody =>
      'تجربه کامل به انگلیسی، دری و پښتو — هر زمان از نوار ابزار عوض کنید.';

  @override
  String get landingWhyTitle => 'چرا زوره‌ولت';

  @override
  String get landingWhyFastTitle => 'شارژ سریع';

  @override
  String get landingWhyFastBody =>
      'خرید را سریع تکمیل کنید و از مبلغ به بسته بدون دردسر برسید.';

  @override
  String get landingWhySecureTitle => 'پرداخت امن';

  @override
  String get landingWhySecureBody =>
      'تسویه از طریق درگاه معتبر — اطلاعات کارت روی سرورهای ما ذخیره نمی‌شود.';

  @override
  String get landingWhyPricingTitle => 'قیمت شفاف';

  @override
  String get landingWhyPricingBody =>
      'قبل از پرداخت هزینه را به دلار آمریکا ببینید — بدون غافلگیری.';

  @override
  String get landingWhyLangTitle => 'چندزبانه';

  @override
  String get landingWhyLangBody =>
      'به انگلیسی، دری یا پښتو از اپ استفاده کنید — هر کدام که برای شما راحت‌تر است.';

  @override
  String get landingHowTitle => 'چطور کار می‌کند';

  @override
  String get landingHowStep1Title => 'شماره افغان را وارد کنید';

  @override
  String get landingHowStep1Body =>
      'اپراتور و مبلغ به دلار را انتخاب کنید یا بستهٔ اعتبار یا اینترنت را برگزینید.';

  @override
  String get landingHowStep2Title => 'بررسی و پرداخت امن';

  @override
  String get landingHowStep2Body =>
      'جزئیات را تأیید کنید، سپس در صفحهٔ امن Stripe پرداخت کنید — اطلاعات کارت نزد ما ذخیره نمی‌شود.';

  @override
  String get landingHowStep3Title => 'شارژ تحویل داده می‌شود';

  @override
  String get landingHowStep3Body =>
      'سفارش شما پردازش و اعتبار به خط موبایل گیرنده ارسال می‌شود.';

  @override
  String get landingFooterNote => 'زوره‌ولت · شارژ موبایل افغانستان';

  @override
  String get successScreenTitle => 'همه‌چیز مرتب است';

  @override
  String get successPaymentConfirmed => 'پرداخت دریافت شد';

  @override
  String get successStripeConfirmedShort =>
      'بانک شما خرید را تأیید کرد. اکنون در حال تکمیل شارژ هستیم.';

  @override
  String get successMissingReturnParamsHint =>
      'این آدرس جزئیات مرجع پرداخت (جلسه یا شماره سفارش) را ندارد. اگر پرداخت را انجام دادید، «سفارش‌های اخیر» را باز کنید یا از ایمیل تأیید Stripe استفاده کنید.';

  @override
  String successBootstrapWarning(String detail) {
    return 'نتوانستیم وضعیت زنده سفارش را به‌روز کنیم. پرداخت شما ممکن است هنوز در حال پردازش باشد — لحظاتی بعد «سفارش‌های اخیر» را بررسی کنید.\n$detail';
  }

  @override
  String get receiptTitle => 'رسید';

  @override
  String get receiptOrderRef => 'شماره سفارش';

  @override
  String get receiptPaymentStatus => 'پرداخت';

  @override
  String get receiptFulfillmentStatus => 'وضعیت شارژ';

  @override
  String get receiptTrustTitle => 'رسید';

  @override
  String get receiptTrustPaidUsd => 'پرداخت‌شده (دلار آمریکا)';

  @override
  String get receiptTrustDeliveredValue => 'ارزش تحویل‌شده (دلار آمریکا)';

  @override
  String get receiptTrustStatus => 'وضعیت';

  @override
  String get receiptTrustUpdatedAt => 'آخرین به‌روزرسانی';

  @override
  String get receiptTrustPaidAt => 'زمان پرداخت';

  @override
  String receiptTrustFeeFinal(String fee) {
    return 'کارمزد پردازش (نهایی): $fee';
  }

  @override
  String receiptTrustFeeEstimated(String fee) {
    return 'کارمزد پردازش (برآوردی): $fee';
  }

  @override
  String get receiptTrustFxNoteTitle => 'ارز';

  @override
  String get receiptTrustDeliveryNoteTitle => 'زمان تحویل';

  @override
  String get orderTrustStatusProcessing => 'در حال پردازش';

  @override
  String get orderTrustStatusDelivered => 'تحویل داده شد';

  @override
  String get orderTrustStatusDelayed => 'تأخیر';

  @override
  String get orderTrustStatusFailed => 'ناموفق';

  @override
  String get orderTrustStatusCancelled => 'لغو شد';

  @override
  String get receiptWhatNextTitle => 'قدم بعدی';

  @override
  String get receiptWhatNextBody =>
      'اعتبار به شبکه‌ای که انتخاب کردید ارسال می‌شود. بیشتر شارژها در چند دقیقه تمام می‌شود. این صفحه در سفارش‌های اخیر باقی می‌ماند.';

  @override
  String get successViewOrders => 'سفارش‌های اخیر';

  @override
  String get successBackHome => 'خانه';

  @override
  String get trustSecurePayment => 'پرداخت امن';

  @override
  String get trustEncrypted => 'درگاه رمزنگاری‌شده';

  @override
  String get trustTransparentPricing => 'قیمت شفاف';

  @override
  String get trustLiveTracking => 'پیگیری زنده';

  @override
  String get timelineTitle => 'پیشرفت سفارش';

  @override
  String get timelinePayment => 'پرداخت دریافت شد';

  @override
  String get timelinePreparing => 'آماده‌سازی شارژ';

  @override
  String get timelineSending => 'ارسال به اپراتور';

  @override
  String get timelineDelivered => 'تحویل به خط';

  @override
  String get trackingHeadlineDelivered => 'اعتبار در راه است';

  @override
  String get trackingBodyDelivered =>
      'پرداخت شما امن است و اپراتور اعتبار را به شماره انتخابی اعمال می‌کند. پس از اتمام شبکه، مرجع تأیید را خواهید دید.';

  @override
  String get trackingHeadlineNeedsHelp => 'این شارژ کامل نشد';

  @override
  String get trackingBodyFailedCalm =>
      'پرداخت شما سپرده امن است و چیزی از دست نرفته. تیم ما می‌تواند سفارش را بررسی کند. در تماس با پشتیبانی شماره سفارش را نگه دارید.';

  @override
  String get trackingHeadlineRetrying => 'در حال تلاش مجدد برای ارسال';

  @override
  String get trackingBodyRetrying =>
      'گاهی شبکه لحظه‌ای تاخیر دارد. ما خودکار دوباره تلاش می‌کنیم؛ فعلاً نیازی به کار شما نیست.';

  @override
  String get trackingHeadlineSending => 'در حال ارسال اعتبار';

  @override
  String get trackingBodySending =>
      'بسته به شبکه موبایل می‌رود؛ معمولاً سریع تمام می‌شود.';

  @override
  String get trackingHeadlinePreparing => 'در حال آماده‌سازی شارژ';

  @override
  String get trackingBodyPreparing =>
      'پرداخت تأیید شد. در حال آماده‌سازی ارسال به شبکه و شماره درست هستیم.';

  @override
  String get trackingHeadlinePaymentConfirming => 'در حال تأیید پرداخت';

  @override
  String get trackingBodyPaymentConfirming =>
      'بانک در حال نهایی‌کردن مجوز است — کمی صبر کنید، پس از آن تحویل آغاز می‌شود.';

  @override
  String get trackingHeadlinePaymentReceived => 'پرداخت ثبت شد';

  @override
  String get trackingBodyPaymentReceived =>
      'Stripe پرداخت شما را تأیید کرد. مراحل بعد خودکار انجام می‌شود.';

  @override
  String get trackingHeadlineCatchingUp => 'تقریباً آماده';

  @override
  String get trackingBodyCatchingUp =>
      'در حال هم‌گام‌کردن وضعیت. پرداخت ثبت شده — یک دقیقه دیگر برر کنید یا سفارش‌های اخیر را باز کنید.';

  @override
  String get trackingHeadlineVerifying => 'در حال تأیید با اپراتور';

  @override
  String get trackingBodyVerifying =>
      'پرداخت شما امن است. مرحله نهایی را با اپراتور موبایل تأیید می‌کنیم و فقط وقتی اطمینان داشتیم «تحویل‌شده» نشان می‌دهیم — ممکن است کمی بیشتر طول بکشد.';

  @override
  String get trackingHeadlineSignIn => 'برای وضعیت زنده وارد شوید';

  @override
  String get trackingBodySignIn =>
      'پرداخت ثبت است. با ورود می‌توانید جزئیات تحویل را هر وقت تازه کنید.';

  @override
  String get paymentSafeBanner =>
      'پرداخت شما محافظت می‌شود. تسویه با Stripe است — ما کارت شما را نگاه نمی‌داریم.';

  @override
  String get cancelScreenTitle => 'پرداخت متوقف شد';

  @override
  String get cancelScreenLead =>
      'اشکالی ندارد — هر وقت بخواهید دوباره می‌توانید.';

  @override
  String get cancelScreenBody =>
      'هیچ مبلقی کسر نشد. وقتی آماده شدید برگردید و با درگاه امن ادامه دهید.';

  @override
  String get cancelBackHome => 'خانه';

  @override
  String get ordersScreenTitle => 'سفارش‌های اخیر';

  @override
  String get ordersEmptyTitle => 'هنوز سفارشی نیست';

  @override
  String get ordersEmptyBody =>
      'پس از تکمیل شارژ، رسید اینجا نشان داده می‌شود تا تحویل را دنبال کنید.';

  @override
  String get ordersEmptyBodySignedIn =>
      'با ورود، رسیدهای شارژ در حساب شما نگه داشته می‌شوند و اینجا نمایش داده می‌شوند. سفارش‌های قدیمی فقط روی دستگاه همچنین دیده می‌شوند.';

  @override
  String get ordersSourceAccount => 'همگام';

  @override
  String get ordersSourceDevice => 'همین دستگاه';

  @override
  String get ordersCloudRefreshFailed =>
      'اتصال به سفارش‌های حساب برقرار نشد. موارد ذخیره‌شده روی این دستگاه نمایش داده می‌شود.';

  @override
  String get ordersDetailTitle => 'جزئیات سفارش';

  @override
  String get ordersSectionLive => 'وضعیت فعلی';

  @override
  String get ordersSectionRecord => 'رسید';

  @override
  String get ordersCopyReference => 'کپی مرجع';

  @override
  String get ordersReferenceCopied => 'مرجع کپی شد';

  @override
  String get trackingHeadlineCancelled => 'این سفارش لغو شد';

  @override
  String get trackingBodyCancelled =>
      'پرداختی برای این سفارش تکمیل نشد. هر زمان می‌توانید شارژ جدید بزنید.';

  @override
  String ordersLastUpdated(String time) {
    return 'به‌روزرسانی $time';
  }

  @override
  String get orderStatusDelivered => 'تحویل شد';

  @override
  String get orderStatusInProgress => 'در حال انجام';

  @override
  String get orderStatusRetrying => 'تلاش مجدد';

  @override
  String get orderStatusFailed => 'نیاز به بررسی';

  @override
  String get orderStatusPaymentPending => 'تأیید پرداخت';

  @override
  String get orderStatusCancelled => 'لغو شد';

  @override
  String get orderStatusSending => 'در حال ارسال';

  @override
  String get orderStatusVerifying => 'در حال تأیید تحویل';

  @override
  String get orderStatusPreparing => 'در حال آماده‌سازی';

  @override
  String get hubTileOrdersTitle => 'سفارش‌های اخیر';

  @override
  String get hubTileOrdersSub => 'رسیدها · همگام با حساب پس از ورود';

  @override
  String get receiptPaymentPaid => 'پرداخت شد';

  @override
  String get receiptPaymentPending => 'در حال تأیید';

  @override
  String get receiptFulfillmentDone => 'ارسال شد';

  @override
  String get receiptFulfillmentProgress => 'در حال پردازش';

  @override
  String get receiptCarrierRef => 'مرجع اپراتور';

  @override
  String get rechargeFailureCalmTitle => 'پرداخت کامل نشد';

  @override
  String get rechargeFailureCalmBody =>
      'هیچ مبلقی کسر نشد. اتصال را بررسی و دوباره امتحان کنید — جزئیات شما اینجاست.';

  @override
  String get checkoutTrustCallout =>
      'پرداخت در صفحه امن Stripe انجام می‌شود. کارت از سرورهای ما عبور نمی‌کند.';

  @override
  String get loyaltyHubTitle => 'اعتبار خانوادگی';

  @override
  String get loyaltyHubSubtitle =>
      'از شارژهای تکمیل‌شده امتیاز بگیرید — بدون قرعه‌کشی؛ فعالیت شفاف و کنترل‌شده.';

  @override
  String get loyaltyLifetimePoints => 'امتیاز کل';

  @override
  String get loyaltyMonthPoints => 'این ماه';

  @override
  String get loyaltyMonthRank => 'رتبه ماهانه';

  @override
  String get loyaltyGroupPoints => 'امتیاز گروه خانواده';

  @override
  String get loyaltyGroupRank => 'رتبه گروه';

  @override
  String get loyaltyLeaderboardTab => 'جدول';

  @override
  String get loyaltyYouTab => 'شما و خانواده';

  @override
  String get loyaltyTopGroups => 'برترین گروه‌ها';

  @override
  String get loyaltyTopMembers => 'فعال‌ترین‌ها';

  @override
  String get loyaltyRecognitionBand => 'سطح بازشناسی';

  @override
  String get loyaltyProgressClimb =>
      'با سفارش‌های واجد شرایط در جدول بالا بیایید — نه شانس تصادفی.';

  @override
  String get loyaltyLegalFootnote =>
      'امتیاز فقط بر اساس سفارش‌های موفق است؛ قرعه‌کشی یا بازی شانسی وجود ندارد.';

  @override
  String get loyaltyCreateGroup => 'ایجاد گروه خانواده';

  @override
  String get loyaltyJoinGroup => 'پیوستن با کد دعوت';

  @override
  String get loyaltyInviteHint =>
      'فقط مالک می‌تواند کد را به اشتراک بگذارد؛ در چت‌های مطمئن نگه دارید.';

  @override
  String get loyaltyDissolveGroup => 'پایان گروه';

  @override
  String get loyaltyLeaveGroup => 'ترک گروه';

  @override
  String get loyaltyRefresh => 'به‌روزرسانی';

  @override
  String get hubTileLoyaltyTitle => 'اعتبار خانوادگی';

  @override
  String get hubTileLoyaltySub => 'امتیاز · جدول · دعوت';

  @override
  String loyaltyDaysLeft(int days) {
    return '$days روز مانده از این ماه';
  }

  @override
  String loyaltyPointsToRankAhead(int points, int rank) {
    return '$points امتیاز تا هم‌ردیف #$rank';
  }

  @override
  String loyaltyRanksToTier(int ranks, String tier) {
    return '$ranks رتبه تا $tier';
  }

  @override
  String loyaltyYouPlacement(String label) {
    return '$label این ماه';
  }

  @override
  String get loyaltyTightBehind =>
      'فاصله‌ها کم است — ثبت سفارش، جایگاه را پایدار می‌کند.';

  @override
  String loyaltyChasingPack(int rank, int pts) {
    return 'ردیف #$rank با فاصله $pts امتیاز';
  }

  @override
  String get loyaltyProgressYourMonthTitle => 'شتاب ماهانه شما';

  @override
  String get loyaltyProgressGroupTitle => 'شتاب ماهانه خانواده';

  @override
  String get loyaltyProgressTierTitle => 'مسیر سطح بعدی';

  @override
  String get loyaltyProgressRankTitle => 'نزدیک‌شدن به رتبه بالاتر';

  @override
  String loyaltyGroupBoardGap(int pts) {
    return '$pts امتیاز تا حرکت در جدول گروه‌ها';
  }

  @override
  String loyaltyYourShareOfFamily(int pct) {
    return 'سهم شما از امتیاز ماه خانواده: $pct٪';
  }

  @override
  String get loyaltySoloFamilyMonth => 'شما ریتم ماه خانواده را تعیین می‌کنید.';

  @override
  String get loyaltyCarryingMost => 'بیشترین فعالیت ماه خانواده از شماست.';

  @override
  String get loyaltyAchievementsHeading => 'نقاط عطف';

  @override
  String get loyaltyAchFirstOrderTitle => 'اولین سفارش مؤثر';

  @override
  String get loyaltyAchFirstOrderSub =>
      'پیشرفت با یک شارژ تکمیل‌شده شروع می‌شود.';

  @override
  String get loyaltyAchCenturyTitle => '۱۰۰ امتیاز مادام‌العمر';

  @override
  String get loyaltyAchCenturySub => 'ثبات مهم است — متشکریم.';

  @override
  String get loyaltyAchGroupTitle => 'مدار خانواده';

  @override
  String get loyaltyAchGroupSub => 'گروه شما به یک نشانه هم‌افزایی رسید.';

  @override
  String get loyaltyRankBadge => 'رتبه';

  @override
  String get notifOrderPaymentTitle => 'پرداخت تأیید شد';

  @override
  String get notifOrderPaymentBody =>
      'شارژ شما ثبت است — در حال آماده‌سازی ارسال.';

  @override
  String get notifOrderPreparingTitle => 'آماده‌سازی شارژ';

  @override
  String get notifOrderPreparingBody =>
      'در حال هم‌ترازی با اپراتور انتخابی شما.';

  @override
  String get notifOrderSendingTitle => 'ارسال به اپراتور';

  @override
  String get notifOrderSendingBody => 'اعتبار در راه است — معمولاً چند دقیقه.';

  @override
  String get notifOrderDeliveredTitle => 'تحویل شد';

  @override
  String get notifOrderDeliveredBody =>
      'احتمالاً روی خط دیده می‌شود — برای رسید بزنید.';

  @override
  String get notifOrderRetryingTitle => 'کمی بیشتر زمان';

  @override
  String get notifOrderRetryingBody =>
      'شبکه درخواست تلاش مجدد داد — ما خودکار ادامه می‌دهیم.';

  @override
  String get notifOrderFailedTitle => 'کنار شماییم';

  @override
  String get notifOrderFailedBody =>
      'پرداخت شما محفوظ است — برای گام بعد آرام باز کنید.';

  @override
  String get notifInboxTitle => 'به‌روزرسانی‌ها';

  @override
  String get notifInboxEmpty => 'همه چیز به‌روز است.';

  @override
  String get notifHubTooltip => 'اعلان‌ها';

  @override
  String get notifLoyaltyRankUpTitle => 'پیشروی شما';

  @override
  String get notifLoyaltyRankUpBody =>
      'رتبه ماهانه بهتر شد — اعتبار خانوادگی را ببینید.';

  @override
  String get notifLoyaltyRankDownTitle => 'جدول جابه‌جا شد';

  @override
  String get notifLoyaltyRankDownBody =>
      'پیشتازی دیگران موقت است — فعالیت منظم کمک می‌کند.';

  @override
  String get notifLoyaltyMilestoneTitle => 'نقطه عطف امتیاز';

  @override
  String get notifLoyaltyMilestoneBody =>
      'به یک نشان recognition رسیدید — جزئیات در اعتبار خانوادگی.';

  @override
  String get notifLoyaltyMonthUrgencyTitle => 'نزدیک پایان ماه';

  @override
  String get notifLoyaltyMonthUrgencyBody =>
      'چند روز مانده تا تثبیت جایگاه این ماه.';

  @override
  String get notifMarkAllRead => 'همه خوانده شد';

  @override
  String get helpCenterTitle => 'مرکز راهنما';

  @override
  String get helpCenterSubtitle =>
      'پاسخ‌های روشن درباره پرداخت، تحویل و سفارش‌ها — به زبان ساده.';

  @override
  String get helpSectionPaymentTitle => 'ایمنی پرداخت';

  @override
  String get helpSectionPaymentBody =>
      'پرداخت در صفحه امن Stripe انجام می‌شود. Zora-Walat شماره کارت کامل شما را نمی‌بیند و ذخیره نمی‌کند. اگر تراکنش در بانک دیده شود، به‌معنای تأیید خریدی است که انتخاب کرده‌اید.';

  @override
  String get helpSectionDeliveryTitle => 'زمان تحویل';

  @override
  String get helpSectionDeliveryBody =>
      'بیشتر شارژهای افغانستان ظرف چند دقیقه می‌رسند؛ گاهی اپراتور زمان بیشتری می‌خواهد. صفحه سفارش را بکشید تا تازه شود — وضعیت به‌محض دریافت گزارش به‌روز می‌شود.';

  @override
  String get helpSectionRetryTitle => 'تلاش مجدد و تأخیر کوتاه';

  @override
  String get helpSectionRetryBody =>
      'گاهی شبکه درخواست تلاش دوباره می‌دهد؛ سیستم ما خودکار هندل می‌کند. نیاز به پرداخت دوبسته نیست. اگر غیرعادی طول بکشد، رکورد پرداخت امن می‌ماند تا با اپراتور هماهنگ شود.';

  @override
  String get helpSectionTrackingTitle => 'پیگیری سفارش';

  @override
  String get helpSectionTrackingBody =>
      'مراحل شبیه حامل است: پرداخت، آماده‌سازی، ارسال به اپراتور، سپس تحویل. هرچه به توجه شما نیاز دارد شفاف برچسب می‌خورد — بدون اصطلاح فنی مبهم.';

  @override
  String get helpSectionLoyaltyTitle => 'پاداش و امتیاز خانواده';

  @override
  String get helpSectionLoyaltyBody =>
      'شارژهای موفق امتیاز پیژنش برای شما و گروه اختیاری خانواده می‌سازد؛ قرعه‌کشی تصادفی نیست — جایگاه از فعالیت واقعی روی جدول دیده می‌شود.';

  @override
  String get helpSectionContactTitle => 'تماس و گام بعد';

  @override
  String get helpSectionContactBody =>
      'در هر سفارش «کپی برای پشتیبانی» را بزنید تا خلاصه حرفه‌ای (شماره سفارش، شبکه، شماره ماسک‌شده، وضعیت‌ها و زمان) آماده شود — سریع‌ترین راه کمک دقیق بدون افشای اطلاعات خصوصی.';

  @override
  String get helpOpenLoyalty => 'باز کردن اعتبار خانوادگی';

  @override
  String get supportNeedHelp => 'کمک نیاز دارید؟';

  @override
  String get supportOpenHelpCenter => 'مرکز راهنما';

  @override
  String get supportCopyPacket => 'کپی برای پشتیبانی';

  @override
  String get supportPacketCopied => 'خلاصه پشتیبانی کپی شد';

  @override
  String get supportPacketHeader => 'Zora-Walat — خلاصه پشتیبانی';

  @override
  String get supportPacketOrderRef => 'شماره سفارش';

  @override
  String get supportPacketRoute => 'مسیر';

  @override
  String get supportPacketRouteValue => 'شارژ موبایل (اعتبار / بسته)';

  @override
  String get supportPacketRecipient => 'گیرنده (ماسک‌شده)';

  @override
  String get supportPacketUpdated => 'آخرین به‌روزرسانی';

  @override
  String get supportAssistRetryingTitle => 'در حال تلاش خودکار';

  @override
  String get supportAssistRetryingBody =>
      'شبکه اپراتور تلاش دوباره خواسته؛ این رایج است — نیاز نیست دوباره پرداخت یا شروع تازه کنید.';

  @override
  String get supportAssistRetryingNext =>
      'چند دقیقه صبر کنید، سپس صفحه را به‌پایین بکشید تا تازه شود.';

  @override
  String get supportAssistDelayedTitle => 'هنوز در حال هم‌ترازی';

  @override
  String get supportAssistDelayedBody =>
      'همگام‌سازی یا تحویل کمی بیشتر طول کشیده؛ پرداخت ثبت شده و از بین نمی‌رود.';

  @override
  String get supportAssistDelayedNext =>
      'صفحه را تازه کنید، سفارش‌های اخیر را ببینید؛ در صورت نیاز وارد حساب شوید تا وضعیت زنده بیاید.';

  @override
  String get supportAssistFailedTitle => 'با دقت بررسی می‌کنیم';

  @override
  String get supportAssistFailedBody =>
      'مسیر اول تحویل کامل نشد اما پرداخت محفوظ مانده؛ با شماره سفارش می‌توان با دو طرف هماهنگ کرد — نگرانی پنهان یا پرداخت دوباره لازم نیست.';

  @override
  String get supportAssistFailedNext =>
      'خلاصه پشتیبانی را کپی کنید و همراه درخواست کمک ارسال کنید.';

  @override
  String get supportAssistPaymentConfirmTitle => 'پرداخت در حال تأیید';

  @override
  String get supportAssistPaymentConfirmBody =>
      'بانک یا شبکه کارت در حال نهایی‌کردن اجازه است؛ ممکن است لحظه‌ای طول بکشد. تا تأیید کامل، ارسال شروع نمی‌شود و دو بار هزینه نمی‌شود.';

  @override
  String get supportAssistPaymentConfirmNext =>
      'کمی همین‌جا بمانید؛ اگر ماند، بعد از یک دقیقه تازه کنید یا سفارش‌های اخیر را ببینید.';

  @override
  String get supportAssistOperatorTitle => 'منتظر تأیید اپراتور';

  @override
  String get supportAssistOperatorBody =>
      'اعتبار از سمت ما به اپراتور موبایل رسیده؛ بیشتر فوراً تأیید می‌شود و بعضی شبکه‌ها دسته‌ای گزارش می‌دهند.';

  @override
  String get supportAssistOperatorNext =>
      'چند دقیقه صبر و تازه کردن کافی است؛ در صورت نیاز مانده خط را از شبکه بررسی کنید.';

  @override
  String get supportAssistVerifyingTitle => 'هنوز در حال تأیید ایمن';

  @override
  String get supportAssistVerifyingBody =>
      'پرداخت شما محافظت شده است. اپراتور هنوز تأیید نهایی نداده، بنابراین به‌جای حدس، سفارش را در حالت بررسی دقیق نگه می‌داریم — هیچ چیز گم نمی‌شود.';

  @override
  String get supportAssistVerifyingNext =>
      'چند دقیقه صبر کنید، سفارش‌های اخیر را تازه کنید و اگر غیرعادی طول کشید با شماره سفارش به پشتیبانی پیام دهید.';

  @override
  String get supportAssistCancelledTitle => 'سفارش لغو شد';

  @override
  String get supportAssistCancelledBody =>
      'این جلسه قبل از تراکنش موفق متوقف شد؛ هر زمان می‌توانید شارژ تازه بزنید — چیزی معلق نمی‌ماند.';

  @override
  String get supportAssistCancelledNext =>
      'به شارژ برگردید، شماره را چک کنید و در صورت نیاز تسویه را دوباره انجام دهید.';

  @override
  String get supportReassuranceFooter =>
      'ایمنی پرداخت و بررسی دقیق با ماست — وضعیت صادبانه همین‌جاست.';

  @override
  String get supportOrderListHelpTooltip => 'راهنما';

  @override
  String get hubTileHelpTitle => 'کمک و پشتیبانی';

  @override
  String get hubTileHelpSub => 'راهنما · ایمنی پرداخت · کپی جزئیات سفارش';

  @override
  String get ordersDetailLoadingHint => 'در حال بارگذاری رسید…';

  @override
  String get ordersEmptySupportLine =>
      'سؤالی هست؟ از خانه «کمک و پشتیبانی» را بزنید.';

  @override
  String get referralCenterTitle => 'دعوت و پاداش';

  @override
  String get referralCenterSubtitle =>
      'Zora-Walat را با کسانی که اعتماد دارید به‌اشتراک بگذارید. پاداش روشن، قوانین صادقانه — برای خانواده‌هایی که از خارج شارژ می‌فرستند.';

  @override
  String get referralTrustLine =>
      'وقتی اولین شارژ دوستانهٔ شما با موفقیت تمام شود، پاداش به‌صورت خودکار تأیید می‌شود — بدنمایه‌بازی؛ فقط تشکر از رشد جامعهٔ ما.';

  @override
  String get referralProgramPaused =>
      'فعلاً دعوت‌ها متوقف است. بعداً سر بزنید — وقتی دوباره باز شود اعلام می‌کنیم.';

  @override
  String get referralYourCode => 'کد دعوت شما';

  @override
  String get referralCopyCode => 'کپی کد';

  @override
  String get referralCodeCopied => 'کد کپی شد';

  @override
  String get referralCopyInviteMessage => 'کپی پیام دعوت';

  @override
  String get referralInviteMessageCopied => 'پیام دعوت کپی شد';

  @override
  String referralInviteMessageTemplate(String code) {
    return 'برای شارژ مطمئن موبایل افغانستان از Zora-Walat استفاده می‌کنم. با کد من عضو شوید: $code';
  }

  @override
  String get referralHowItWorksTitle => 'پاداش چگونه کار می‌کند';

  @override
  String referralHowItWorksBody(String rewardUsd, String minUsd) {
    return 'وقتی دوستی با کد شما ثبت‌نام کند و اولین شارژش با موفقیت تحویل شود — حداقل $minUsd — شما $rewardUsd اعتبار کیف‌پول برای خریدهای بعدی می‌گیرید. یک پاداش برای هر دوست.';
  }

  @override
  String get referralRewardRulesFootnote =>
      'اعتبار دعوت فقط برای شارژ است؛ قابل برداشت نقدی نیست. این برای امنیت همه و منصف ماندن قیمت‌هاست.';

  @override
  String get referralWeeklyFairTitle => 'سهیم‌بندی منصفانه هر هفته';

  @override
  String get referralWeeklyFairBody =>
      'پاداش دعوت از یک سهم هفتگی مشترک می‌آید تا خانواده‌های بیشتری شرکت کنند. اگر هفته‌ای شلوغ باشد، ممکن است برخی دعوت‌ها واجد شرایط شوند درحالی‌که سهم تازه می‌شود — دوستان شما همچنان سرویسی را که پرداخت کرده‌اند دریافت می‌کنند.';

  @override
  String get referralStatsInvited => 'دعوت‌شده';

  @override
  String get referralStatsSuccessful => 'موفق';

  @override
  String get referralStatsEarned => 'کسب‌شده';

  @override
  String get referralHistoryTitle => 'دعوت‌های شما';

  @override
  String get referralHistoryEmpty =>
      'با به‌اشتراک‌گذاری کد، هر دوست اینجا با یک وضعیت ساده دیده می‌شود.';

  @override
  String get referralStatusPending => 'در جریان';

  @override
  String get referralStatusCompleted => 'واجد شرایط';

  @override
  String get referralStatusRewarded => 'پاداش داده شد';

  @override
  String get referralStatusRejected => 'بدون پاداش';

  @override
  String get referralPendingHint =>
      'منتظر اتمام موفق اولین شارژ دوست شما هستیم.';

  @override
  String get referralCompletedHint =>
      'واجد شرایط — پاداش شما در حال نهایی‌شدن است.';

  @override
  String get referralRewardedHint =>
      'متشکریم — اعتبار در کیف‌پول شما برای شارژهای بعدی است.';

  @override
  String get referralRejectedDetailBudget =>
      'پاداش‌های دعوت این هفته قبلاً تخصیص یافته بود. سرویس دوست شما انجام شد — از اشتراک Zora-Walat سپاسگزاریم.';

  @override
  String get referralRejectedDetailWeeklyCap =>
      'به سقف پاداش دعوت این هفته رسیده‌اید. هفتهٔ بعد می‌توانید دوباره دعوت کنید.';

  @override
  String get referralRejectedDetailLifetimeCap =>
      'به سقف بلندمدت پاداش دعوت حساب خود رسیده‌اید. قدردان همراهی شما با Zora-Walat هستیم.';

  @override
  String get referralRejectedDetailNotEligible =>
      'این دعوت با شرایط پاداش هم‌خوان نبود. دوست شما همچنان می‌تواند عادی از Zora-Walat استفاده کند.';

  @override
  String get referralRejectedDetailGeneric =>
      'این دعوت پاداش نگرفت. اگر پرسشی دارید، با حساب خود «کمک و پشتیبانی» را باز کنید.';

  @override
  String referralRewardAmountLine(String amount) {
    return 'پاداش: $amount';
  }

  @override
  String get hubTileReferralTitle => 'دعوت و پاداش';

  @override
  String get hubTileReferralSub => 'کد خود را بفرستید · اعتبار کیف‌پول';
}
