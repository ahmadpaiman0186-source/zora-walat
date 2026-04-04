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
      'اعتبار یا بستهٔ دیتا را به شماره‌های افغانستان به دلار بفرستید. سریع، شفاف و قابل اعتماد برای کسانی که از آمریکا، کانادا، بریتانیا یا اروپا شارژ می‌کنند.';

  @override
  String get rechargeTrustLine =>
      'قیمت‌گذاری دلاری · پرداخت امن · موبایل افغانستان';

  @override
  String get recipientNumber => 'شمارهٔ گیرنده';

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
}
