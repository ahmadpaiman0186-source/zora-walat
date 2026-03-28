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
      'توسعه‌دهندگان: STRIPE_PUBLISHABLE_KEY و PAYMENTS_API_BASE_URL را در زمان build بدهید.';

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
  String get paymentSuccessTitle => 'پرداخت موفق';

  @override
  String get paymentSuccessBody =>
      'متشکریم. پرداخت شما تأیید شد؛ تحویل اپراتور به‌زودی انجام می‌شود.';

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
}
