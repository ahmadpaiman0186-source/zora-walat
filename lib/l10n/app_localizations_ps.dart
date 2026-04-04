// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Pushto Pashto (`ps`).
class AppLocalizationsPs extends AppLocalizations {
  AppLocalizationsPs([String locale = 'ps']) : super(locale);

  @override
  String get appTitle => 'زوره‌ولت';

  @override
  String get language => 'ژبه';

  @override
  String get languageEnglish => 'انګلیسی';

  @override
  String get languageDari => 'دری';

  @override
  String get languagePashto => 'پښتو';

  @override
  String get chooseLanguageTitle => 'ژبه وټاکئ';

  @override
  String get splashTagline =>
      'د افغانستان موبایل شارژ له بهر څخه. خوندي، روښانه او چټک.';

  @override
  String get languageOnboardingSubtitle =>
      'تاسو کولی شئ دا هر وخت د ژبې منو څخه بدل کړئ.';

  @override
  String get selectAmount => 'اندازه (USD)';

  @override
  String get continueCta => 'مخته ګورئ';

  @override
  String get rechargeReviewTitle => 'بیاکتنه';

  @override
  String get rechargeReviewSubtitle => 'د بسته غوره کولو دمخه دا تایید کړئ.';

  @override
  String get continueToPlans => 'مخته — تعرفې';

  @override
  String get rechargeReviewStripeHint =>
      'د Apple Pay / Google Pay یا کارډ سره تادیه وکړئ. ستاسو د کارډ معلومات زموږ سرورونو ته نه ځي.';

  @override
  String paymentPayWithCard(String amount) {
    return 'تادیه $amount';
  }

  @override
  String get paymentPreparing => 'خوندي تادیه چمتو کېږي…';

  @override
  String get paymentSuccessTitle => 'تادیه بریالۍ شوه';

  @override
  String get paymentSuccessBody =>
      'تاسو له Stripe څخه راستون شوئ. دا پاڼه یوازې ستاسو د آساتیا لپاره ده — تایید زموږ په سرورونو کې کېږي. اپراتور تحویل وروسته له تایید څخه.';

  @override
  String get paymentFailedTitle => 'تادیه ناکامه شوه';

  @override
  String get paymentCancelledTitle => 'تادیه لغوه شوه';

  @override
  String get paymentCancelledBody =>
      'هیڅ پیسې نه دي اخیستل شوي. کله چې چمتو یاست بیا هڅه وکړئ.';

  @override
  String get paymentCheckoutRedirectTitle => 'Stripe تادیه';

  @override
  String get paymentCheckoutRedirectBody =>
      'په راتلونکي پاڼه کې تادیه بشپړه کړئ. بیرته راغلې وروسته، تایید ممکن یو څه وخت ونیسي.';

  @override
  String get paymentTryAgain => 'بیا هڅه';

  @override
  String get paymentBackToReview => 'جزئیات سمول';

  @override
  String get languageSheetSubtitle => 'انګلیسی، دری او پښتو بشپړ ملاتړ لري.';

  @override
  String get done => 'سمه';

  @override
  String get cancel => 'لغوه';

  @override
  String get help => 'مرسته';

  @override
  String get refresh => 'تازه کول';

  @override
  String get wallet => 'بټوه';

  @override
  String get more => 'نور';

  @override
  String get loading => 'بارېږي…';

  @override
  String get processing => 'پروسس کېږي…';

  @override
  String get rechargeTitle => 'د موبایل شارژ';

  @override
  String get rechargeHero =>
      'په USD کې اېرټایم یا ډیټا افغان شمېرو ته ولېږئ. چټک، روښانه او د باور وړ — له امریکا، کانادا، برتانیا یا اروپا څخه.';

  @override
  String get rechargeTrustLine => 'USD نرخونه · خوندي تادیه · افغان موبایل';

  @override
  String get recipientNumber => 'د اخیستونکي شمېره';

  @override
  String get operator => 'اپراتور';

  @override
  String get getPackages => 'بستې ترلاسه کړئ';

  @override
  String get packages => 'بستې';

  @override
  String packageOptionsCount(int count) {
    return '$count انتخابونه';
  }

  @override
  String get enterRecipientError => 'د اخیستونکي شمېره ولیکئ.';

  @override
  String get noPackagesForOperator => 'د دې اپراتور لپاره اوس بسته نشته.';

  @override
  String get orderPlacedDefault => 'امر ثبت شو';

  @override
  String confirmMockSnack(String label) {
    return '$label · تایید شو';
  }

  @override
  String get tapGetPackagesHint =>
      'د دې شمېرې لپاره تازه وړاندیزونه ترلاسه کولو «بستې ترلاسه کړئ» ووهئ.';

  @override
  String get airtimeLabel => 'اېرټایم';

  @override
  String get dataBundleLabel => 'ډیټا بسته';

  @override
  String get amountLabel => 'مقدار';

  @override
  String get priceLabel => 'بیه';

  @override
  String get buyLabel => 'پېرود';

  @override
  String get apiUnreachableRecharge =>
      'اړیکه نشوه. خپل انټرنټ مو چیک کړئ او بیا هڅه وکړئ.';

  @override
  String get hubSubtitle => 'شارژ · بټوه · زنګ';

  @override
  String get hubTileRechargeTitle => 'د موبایل شارژ';

  @override
  String get hubTileRechargeSub => 'ګړندي بستې · USD بیه';

  @override
  String get hubTileWalletTitle => 'بټوه';

  @override
  String get hubTileWalletSub => 'بیلانس او شارژ';

  @override
  String get hubTileCallingTitle => 'نړیوال زنګ';

  @override
  String get hubTileCallingSub => 'ژر راځي';

  @override
  String get hubTileLegacyTitle => 'پلانونه او کاتالوګ';

  @override
  String get hubTileLegacySub => 'اېرټایم او ډیټا';

  @override
  String get walletScreenTitle => 'بټوه';

  @override
  String get balanceHeroLabel => 'د حساب بیلانس';

  @override
  String get availableLabel => 'شته';

  @override
  String get quickTopUp => 'چټک شارژ';

  @override
  String get walletTopUpHint =>
      'په خوندي ډول پیسې زیات کړئ؛ ازمایښي کریډیټ سمدستي پلي کېږي.';

  @override
  String topUpSuccessSnack(String amount) {
    return '$amount زیات شو · بیلانس تازه شو';
  }

  @override
  String get apiUnreachableWallet =>
      'اړیکه نشوه. خپل انټرنټ مو چیک کړئ او بیا هڅه وکړئ.';

  @override
  String get telecomHomeSubtitle => 'افغان موبایل · USD تادیه · خوندي';

  @override
  String get aboutTitle => 'د زوره‌ولت په اړه';

  @override
  String get aboutBody =>
      'بیې په USD کې ښودل کېږي. د کارت تادیه خوندي پروسس کېږي؛ اېرټایم او ډیټا د اپراتور یوځای کیدو له لارې سپارل کېږي.';

  @override
  String get aboutDevHint =>
      'پرمختللونکي: د Stripe publishable کیلي په lib/stripe_keys.dart کې وټاکئ؛ اړتیا په PAYMENTS_API_BASE_URL په build کې ورکړئ.';

  @override
  String get tabAirtime => 'اېرټایم';

  @override
  String get tabDataPackages => 'ډیټا بستې';

  @override
  String get tabIntlCalling => 'بهرنی زنګ';

  @override
  String get callingTitle => 'نړیوال زنګ';

  @override
  String get callingBody =>
      'موږ د شارژ په څېر خوندي تادیه سره نړیوال زنګ جوړوو.\nژر بیرته راشئ.';

  @override
  String get missingOrder =>
      'دا امر نه پرانستل شو. بیرته لاړ شئ او بیا هڅه وکړئ.';

  @override
  String get paymentCancelled => 'تادیه لغوه شوه';

  @override
  String get reviewPayTitle => 'کتنه او تادیه';

  @override
  String get orderSummary => 'د امر لنډیز';

  @override
  String get serviceLabel => 'خدمت';

  @override
  String get phoneNumberLabel => 'د تلیفون شمېره';

  @override
  String get operatorLabel => 'اپراتور';

  @override
  String get packageLabel => 'بسته';

  @override
  String get totalUsd => 'ټول (USD)';

  @override
  String get stripeSectionTitle => 'خوندي تادیه';

  @override
  String get stripeKeyMissing => 'د دې build لپاره Stripe publishable کی نشته.';

  @override
  String get stripeKeyLoaded =>
      'د کارت تادیه چمتو ده. ستاسو سرور PaymentIntent جوړوي او client_secret ورکوي.';

  @override
  String get payWithStripe => 'د کارت سره تادیه';

  @override
  String get lineAirtime => 'اېرټایم';

  @override
  String get lineDataPackage => 'ډیټا بسته';

  @override
  String get lineInternational => 'نړیوال';

  @override
  String get telecomAirtimeHeadline => 'د موبایل شارژ';

  @override
  String get telecomAirtimeSubtitle =>
      'افغان بې سیم، MTN، اتصالات یا روشن شارژ کړئ. USD بیه او خوندي تادیه.';

  @override
  String get telecomSelectOperatorSnack =>
      'شبکه وټاکئ یا داسې شمېره ولیکئ چې پیژنو.';

  @override
  String get telecomChooseAmountSnack => 'د دوام لپاره مقدار وټاکئ.';

  @override
  String telecomDetectedOperator(String name) {
    return 'پیژندل شو: $name';
  }

  @override
  String get telecomPrefixUnknown =>
      'مختاړ نه پیژندل شو — لاندې اپراتور وټاکئ.';

  @override
  String get telecomUseAutoDetect => 'خپکار پېژندنه';

  @override
  String get telecomMinuteBundlesTitle => 'د دقیقو بستې (USD)';

  @override
  String get telecomEnterNumberForAmounts =>
      'معتبر شمېره ولیکئ او اپراتور تایید کړئ ترڅو مقدارونه ښکاره شي.';

  @override
  String get telecomPhoneHintAirtime => '07X XXX XXXX یا 937…';

  @override
  String get telecomDataHeadline => 'ډیټا بستې';

  @override
  String get telecomDataSubtitle =>
      'ورځنۍ، اونیزې او میاشتنۍ بستې. ټول په USD کې.';

  @override
  String get telecomPhoneHintData => '07X XXX XXXX';

  @override
  String get intlTabHeadline => 'نړیوال زنګ';

  @override
  String get intlTabBody =>
      'ژر: نړیوال دقيقې او لرې فاصلو بستې د هغه خوندي کارت تادیه سره.';

  @override
  String get periodDaily => 'ورځنی';

  @override
  String get periodWeekly => 'اونیز';

  @override
  String get periodMonthly => 'میاشتنی';

  @override
  String get bestValueBadge => 'غوره ارزښت';

  @override
  String get telecomVoiceBundle => 'غږ';

  @override
  String telecomMarginNote(String pct) {
    return 'لږترلږه $pct٪ حاشیه';
  }

  @override
  String get phoneValidationEmpty => 'د موبایل شمېره ولیکئ.';

  @override
  String get phoneValidationInvalid => 'د افغانستان معتبر موبایل شمېره ولیکئ.';

  @override
  String get phoneValidationLength => 'د ۷ وروسته باید ۹ یا ۱۰ عددونه وي.';

  @override
  String get phoneValidationPrefix => 'د افغان موبایل شمېرې د ۷ سره پیل کېږي.';

  @override
  String get phoneValidationFormat => 'د شمېرې بڼه ناسمه ده.';

  @override
  String get telecomNoDataPackages =>
      'د دې اپراتور لپاره اوس ډیټا بسته نشته. بل اپراتور وټاکئ یا وروسته بیا راشئ.';

  @override
  String dataVolumeGb(String n) {
    return '$n GB';
  }

  @override
  String dataVolumeMb(String n) {
    return '$n MB';
  }

  @override
  String get validityOneDay => '۱ ورځ';

  @override
  String get validity7Days => '۷ ورځې';

  @override
  String get validity30Days => '۳۰ ورځې';

  @override
  String validityNDays(String n) {
    return '$n ورځې';
  }

  @override
  String get currencyUsdHint => 'بیې په امریکایي ډالرو (USD) کې دي.';

  @override
  String get actionRetry => 'بیا هڅه';

  @override
  String get telecomCatalogLoadError =>
      'انتخابونه نه بار شول. اړیکه مو وګورئ او «بیا هڅه» ووهئ.';

  @override
  String get telecomAirtimeEmpty => 'د دې شبکې لپاره اوس هیڅ مقدار نشته.';

  @override
  String get telecomLoadingAmounts => 'مقدارونه بارېږي…';

  @override
  String get checkoutYourOrder => 'ستاسو امر';

  @override
  String get checkoutPaymentSecureNote =>
      'تادیه په خوندي Stripe پاڼه کې کېږي. ستاسو د کارډ معلومات زموږ سرورونو ته نه ځي.';

  @override
  String get telecomDataPackagesSectionTitle => 'بسته وټاکئ';

  @override
  String get telecomDataLoadingPackages => 'بستې بارېږي…';

  @override
  String get authSignInTitle => 'ننوتل';

  @override
  String get authRegisterTitle => 'حساب جوړول';

  @override
  String get authEmailLabel => 'بریښنالیک';

  @override
  String get authPasswordLabel => 'پټنوم';

  @override
  String get authSignInCta => 'ننوتل';

  @override
  String get authRegisterCta => 'نوم لیکنه';

  @override
  String get authRegisterPasswordHint => 'لږترلږه ۱۰ توري وکاروئ';

  @override
  String get authSwitchToRegister => 'حساب نشته؟ نوم لیکنه';

  @override
  String get authSwitchToSignIn => 'حساب لرئ؟ ننوتل';

  @override
  String get authRequiredMessage => 'د دوام لپاره مهرباني وکړئ ننوځئ.';

  @override
  String get authSignOut => 'وتل';

  @override
  String get authAccountTileTitle => 'حساب';

  @override
  String get authAccountTileSignedInSub => 'ننوتلی یاست';

  @override
  String get authAccountTileSignedOutSub => 'د بټوې او تادیې لپاره ننوځئ';

  @override
  String get authGenericError => 'ستونزه رامنځته شوه. بیا هڅه وکړئ.';

  @override
  String get authFillAllFields => 'بریښنالیک او پټنوم ولیکئ.';

  @override
  String get landingNavBrand => 'زوره‌ولت';

  @override
  String get landingHeroTitle => 'افغانستان ته په ثانیو کې ایئرټایم واستوئ';

  @override
  String get landingHeroSubtitle =>
      'د افغان شمېرو لپاره نړیوال موبایل ټاپ‌آپ — د هغو کورنیو لپاره چې په چټک او باوري لار اړتیا لري.';

  @override
  String get landingTrustBadge => 'د USD نرخونه · خوندي تادیه · د مهاجرو لپاره';

  @override
  String get landingCtaGetStarted => 'پیل کړئ';

  @override
  String get landingCtaSignIn => 'ننوتل';

  @override
  String get landingLanguagesTitle => 'ژبې';

  @override
  String get landingLanguagesBody =>
      'په انګلیسي، دري او پښتو بشپړ تجربه — هر وخت له پټلۍ څخه بدل کړئ.';

  @override
  String get landingWhyTitle => 'ولې زوره‌ولت';

  @override
  String get landingWhyFastTitle => 'چټک ټاپ‌آپ';

  @override
  String get landingWhyFastBody =>
      'پېرود په چټکۍ بشپړ کړئ او له مقدار څخه بستې ته بې ستونزې لاړ شئ.';

  @override
  String get landingWhySecureTitle => 'خوندي تادیې';

  @override
  String get landingWhySecureBody =>
      'د معتبر چیک‌آوت له لارې تادیه — ستاسو د کارت معلومات زموږ په سرورونو کې نه ساتل کیږي.';

  @override
  String get landingWhyPricingTitle => 'روښانه نرخونه';

  @override
  String get landingWhyPricingBody =>
      'د تادیې دمخه په امریکایي ډالرو کې لګښت ګورئ — په چیک‌آوت کې حیرانونکي نه.';

  @override
  String get landingWhyLangTitle => 'ګڼ‌ژبې تجربه';

  @override
  String get landingWhyLangBody =>
      'په انګلیسي، دري یا پښتو اپ وکاروئ — هغه چې تاسو او کورنۍ ته مناسب وي.';

  @override
  String get landingHowTitle => 'څنګه کار کوي';

  @override
  String get landingHowStep1Title => 'افغان شمېره ولیکئ';

  @override
  String get landingHowStep1Body =>
      'اپراتور او د امریکایي ډالرو مقدار غوره کړئ یا د ایئرټایم یا ډیټا بسته وټاکئ.';

  @override
  String get landingHowStep2Title => 'بیاکتنه او خوندي تادیه';

  @override
  String get landingHowStep2Body =>
      'جزئیات تصدیق کړئ، بیا په Stripe خوندي پاڼه تادیه وکړئ — ستاسو کارت زموږ په سرورونو کې نه ساتل کیږي.';

  @override
  String get landingHowStep3Title => 'ټاپ‌آپ تحویل کیږي';

  @override
  String get landingHowStep3Body =>
      'موږ سفارش پروسس کوو او اعتبار د ترلاسه کوونکي موبایل خط ته لیږو.';

  @override
  String get landingFooterNote => 'زوره‌ولت · د افغانستان موبایل ټاپ‌آپ';
}
