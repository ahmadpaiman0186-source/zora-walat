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
  String get rechargeReviewServerPricingNote =>
      'یوازې اېرټایم. ټولټال په USD کې د چک‌اوټ پیل کې زموږ سرور تاییدوي — تادیه په Stripe امن پاڼه کېږي.';

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
      'په USD کې د افغان موبایل اېرټایم ولېږئ. چټک، روښانه او د باور وړ — له امریکا، کانادا، برتانیا، اروپا، اماراتو یا ترکیې څخه.';

  @override
  String get phase1OnlyAirtimeSnack =>
      'فاز ۱: یوازې د موبایل اېرټایم شتون لري.';

  @override
  String get phase1UsdSecureCheckout =>
      'تاسو په USD کې په Stripe امن پاڼه تادیه کوئ. ټولټال زموږ سرور د پیسو اخیستو دمخه تاییدوي.';

  @override
  String get checkoutCardRegionLabel => 'ستاسو ځای (کارت)';

  @override
  String get checkoutSenderCountryHint =>
      'دا ستاسو د کارت د بلینګ سیمه ده (خطر چیک)؛ ترلاسه کوونکی شمیره تل افغانستان موبایل (+۹۳) ده.';

  @override
  String get telecomRecipientAfghanistanDialHint =>
      'افغانستان +۹۳ — ځایی موبایل ولیکئ (د ۷ پیل سره).';

  @override
  String get checkoutPricingUsdServerNote =>
      'بیه په USD کې زموږ په سرورونو کې ستاسو سیمې لپاره محاسبه کېږي.';

  @override
  String get telecomCheckoutAirtimeRowLabel => 'موبایل اېرټایم';

  @override
  String get phase1ValidityDependsOnOperator =>
      'د اعتبار موده د اپراتور پورې اړه لري — یوازې هغه وخت دلته ښیو چې له بیې څخه تایید شوی مقدار ولرو.';

  @override
  String checkoutAirtimeAmountLine(String amount) {
    return '$amount اېرټایم ولېږئ';
  }

  @override
  String get rechargeTrustLine => 'USD نرخونه · خوندي تادیه · افغان موبایل';

  @override
  String get recipientNumber => 'د اخیستونکي شمېره';

  @override
  String get receivingCountryLabel => 'د اخیستونکي هېواد';

  @override
  String get rechargeCountryNotSupported =>
      'د موبایل شارژ یوازې د افغانستان شمېرو لپاره دی. افغانستان غوره کړئ.';

  @override
  String get phoneLocalDigitsHint => 'ځایی شمېره د هېواد کوډ پرته ولیکئ.';

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
  String get checkoutUsdTotalFootnote =>
      'په USD کې چارج کېږي. که ستاسو کارت USD نه وي، بانک ممکن د بدلون فیس زیات کړي چې موږ نه کنټرولوو.';

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
  String get authInvalidEmail => 'اعتباری بریښنالیک ولیکئ.';

  @override
  String get authEmailRequired => 'خپل بریښنالیک ولیکئ.';

  @override
  String get authOtpEmailIntro =>
      'خپل بریښنالیک ولیکئ څو که حساب وړ وي، تاسو ته د ننوتلو ۶ عددي کوډ واستول شي.';

  @override
  String get authOtpEmailHelp =>
      'هماغه بریښنالیک وکاروئ چې د خپل زوره‌ولت حساب لپاره مو کارولی دی.';

  @override
  String get authOtpContinueCta => 'کوډ ولېږه';

  @override
  String get authOtpCodeTitle => 'کوډ داخل کړئ';

  @override
  String get authOtpCheckEmail => 'خپل انباکس وګورئ';

  @override
  String get authOtpCodeLabel => 'د تایید کوډ';

  @override
  String get authOtpVerifyCta => 'کوډ تایید کړئ';

  @override
  String get authOtpCodeRequired => '۶ عددي تاییدي کوډ ولیکئ.';

  @override
  String get authOtpInvalidOrExpired =>
      'دا کوډ ناسم دی یا موده یې تېره شوې ده. نوی کوډ وغواړئ او بیا هڅه وکړئ.';

  @override
  String get authOtpTooManyAttempts =>
      'ډېرې هڅې شوې دي. مهرباني وکړئ لږ تم شئ او بیا هڅه وکړئ.';

  @override
  String get authNetworkRetry =>
      'د شبکې ستونزه. خپله اړیکه وګورئ او بیا هڅه وکړئ.';

  @override
  String get authOtpRequestSuccess =>
      'که حساب وړ وي، د تایید کوډ استول شوی دی.';

  @override
  String get authOtpResendReady => 'اوس کولی شئ نوی کوډ وغواړئ.';

  @override
  String get authOtpResendCta => 'کوډ بیا ولېږه';

  @override
  String get authOtpChangeEmail => 'بل بریښنالیک وکاروئ';

  @override
  String authOtpCodeHelp(Object email) {
    return '$email ته ۶ عددي کوډ لېږل شوی دی. د دوام لپاره یې لاندې داخل کړئ.';
  }

  @override
  String authOtpResendIn(Object seconds) {
    return 'تاسو کولی شئ په $seconds ثانیو کې کوډ بیا وغواړئ.';
  }

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

  @override
  String get successScreenTitle => 'ټول څه سم دي';

  @override
  String get successPaymentConfirmed => 'تادیه ترلاسه شوه';

  @override
  String get successStripeConfirmedShort =>
      'ستاسو بانک پېرود تایید کړ. موږ اوس ستاسو ټاپ‌آپ بشپړوو.';

  @override
  String get successMissingReturnParamsHint =>
      'په دې پته کې د تادیې حواله جزئیات (سشن یا د سفارش پېژند) نشته. که تادیه مو بشپړه کړه، وروستي سفارشونه خلاص کړئ یا د Stripe د تایید برېښنالیک لینک وکاروئ.';

  @override
  String successBootstrapWarning(String detail) {
    return 'موږ نشو کولی ژمیز د سفارش حالت تازه کړو. ستاسو تادیه شايد لاهم پروسس کې وي — یو ځل بیا وروستي سفارشونه وګورئ.\n$detail';
  }

  @override
  String get receiptTitle => 'رسيډ';

  @override
  String get receiptOrderRef => 'د سفارش شمېره';

  @override
  String get receiptPaymentStatus => 'تادیه';

  @override
  String get receiptFulfillmentStatus => 'د ټاپ‌آپ حالت';

  @override
  String get receiptTrustTitle => 'رسید';

  @override
  String get receiptTrustPaidUsd => 'ورکړل شوی (USD)';

  @override
  String get receiptTrustDeliveredValue => 'سپارل شوې بيه (USD)';

  @override
  String get receiptTrustStatus => 'حالت';

  @override
  String get receiptTrustUpdatedAt => 'وروستی تازه‌کول';

  @override
  String get receiptTrustPaidAt => 'د تادیې وخت';

  @override
  String receiptTrustFeeFinal(String fee) {
    return 'پروسس فیس (پای): $fee';
  }

  @override
  String receiptTrustFeeEstimated(String fee) {
    return 'پروسس فیس (اندازه): $fee';
  }

  @override
  String get receiptTrustFxNoteTitle => 'اسعار';

  @override
  String get receiptTrustDeliveryNoteTitle => 'د سپارلو وخت';

  @override
  String get orderTrustStatusProcessing => 'پروسس کې';

  @override
  String get orderTrustStatusDelivered => 'سپارل شوی';

  @override
  String get orderTrustStatusDelayed => 'ناوخته';

  @override
  String get orderTrustStatusFailed => 'پاتې شوی';

  @override
  String get orderTrustStatusCancelled => 'لغو شوی';

  @override
  String get receiptWhatNextTitle => 'راتلونکی ګام';

  @override
  String get receiptWhatNextBody =>
      'موږ اعتبار هغه شبکې ته لیږو چې تاسو یې غوره کړې. ډېری ټاپ‌اپونه په چند دقیقو کې بشپړېږي. دا پاڼه ستاسو وروستیو سفارشونو کې پاتې کېږي.';

  @override
  String get successViewOrders => 'وروستي سفارشونه';

  @override
  String get successBackHome => 'کور ته';

  @override
  String get trustSecurePayment => 'خوندي تادیه';

  @override
  String get trustEncrypted => 'رمز شوی چیک‌آوت';

  @override
  String get trustTransparentPricing => 'روښانه نرخ';

  @override
  String get trustLiveTracking => 'ژوندۍ مونږه';

  @override
  String get timelineTitle => 'د سفارش پرمختګ';

  @override
  String get timelinePayment => 'تادیه ترلاسه شوه';

  @override
  String get timelinePreparing => 'ټاپ‌آپ چمتو کېږي';

  @override
  String get timelineSending => 'اپراتور ته لیږل';

  @override
  String get timelineDelivered => 'خط ته ورسېدل';

  @override
  String get trackingHeadlineDelivered => 'اعتبار په لاره کې دی';

  @override
  String get trackingBodyDelivered =>
      'ستاسو تادیه خوندي ده او اپراتور اعتبار هغه شمېرې ته لګوي چې تاسو غوره کړې. شبکې بشپړېدو وروسته تاییدی شمېره ښکاري.';

  @override
  String get trackingHeadlineNeedsHelp => 'دا ټاپ‌آپ بشپړ نه شو';

  @override
  String get trackingBodyFailedCalm =>
      'ستاسو تادیه سپما ده — څه له لاسه نه ګرځې. زموږ ټیم سفارش کتلی شي. د ملاتړ لپاره د سفارش شمېره وساتئ.';

  @override
  String get trackingHeadlineRetrying => 'د لیږد لپاره بیا هڅه';

  @override
  String get trackingBodyRetrying =>
      'ځینې وخت شبکې یو څو شېبې وار تیروي. موږ اتومات بیکاري کوو — تاسو اوس څه نه کول پکار دي.';

  @override
  String get trackingHeadlineSending => 'اعتبار لیږل کیږي';

  @override
  String get trackingBodySending =>
      'ستاسو بسته موبایل اپراتور ته ځي — معمولاً ګړندی بشپړېږي.';

  @override
  String get trackingHeadlinePreparing => 'ټاپ‌آپ چمتو کېږي';

  @override
  String get trackingBodyPreparing =>
      'تادیه تایید شوه. موږ سم شبکې او شمېرې ته لیږل چمتو کوو.';

  @override
  String get trackingHeadlinePaymentConfirming => 'تادیه تاییدېږي';

  @override
  String get trackingBodyPaymentConfirming =>
      'ستاسو بانک اجازه بشپړوي — یو څو شېبې صبر وکړئ، بیا لیږل پیلېږي.';

  @override
  String get trackingHeadlinePaymentReceived => 'تادیه ثبت شوه';

  @override
  String get trackingBodyPaymentReceived =>
      'Stripe ستاسو تادیه تایید کړه. نور ګامونه په اتومات ډول کیږي.';

  @override
  String get trackingHeadlineCatchingUp => 'نږدې';

  @override
  String get trackingBodyCatchingUp =>
      'موږ وروستي حالت همغږیوو. تادیه ثبت ده — یوه دقیقه وروسته وګورئ یا وروستي سفارشونه خلاص کړئ.';

  @override
  String get trackingHeadlineVerifying => 'د اپراتور سره تاییدېږي';

  @override
  String get trackingBodyVerifying =>
      'ستاسو تادیه خوندي ده. موږ د موبایل اپراتور سره وروستی پړاو تاییدوو — یوازې کله «تحویل شوی» وښیو چې موږ یقین ولرو. ښايي یو څه وخت ونیسي.';

  @override
  String get trackingHeadlineSignIn => 'ژوندي حالت لپاره ننوځئ';

  @override
  String get trackingBodySignIn =>
      'تادیه ثبت ده. په ننوتلو سره کولی شئ هر وخت لیږل تازه کړئ.';

  @override
  String get paymentSafeBanner =>
      'ستاسو تادیه ساتل کېږي. تادیه Stripe له لارې ده — موږ ستاسو کارت نه ساتو.';

  @override
  String get cancelScreenTitle => 'چیک‌آوت ودرېد';

  @override
  String get cancelScreenLead => 'کومه ستونزه نشته — هر وخت بیا هڅه کولی شئ.';

  @override
  String get cancelScreenBody =>
      'هیڅ نه اخیستل شو. چمتو شئ نو بیرته راشئ او له خوندي چیک‌آوت سره دوام ورکړئ.';

  @override
  String get cancelBackHome => 'کور ته';

  @override
  String get ordersScreenTitle => 'وروستي سفارشونه';

  @override
  String get ordersEmptyTitle => 'لا سفارش نشته';

  @override
  String get ordersEmptyBody =>
      'د ټاپ‌آپ بشپړېدو وروسته رسيډ پدې وسیله کې ښکاري ترڅو لیږنور په مونځه.';

  @override
  String get ordersEmptyBodySignedIn =>
      'کله چې ننوځئ، رسيډونه ستاسو په حساب کې خوندي کېږي او دلته ښکاري. د مخکینۍ وسیلې یوازینۍ سفارشونه هم لیدل کېږي.';

  @override
  String get ordersSourceAccount => 'همغږی';

  @override
  String get ordersSourceDevice => 'دا وسیله';

  @override
  String get ordersCloudRefreshFailed =>
      'ستاسو د حساب سفارشونو ته لیږد ونشو. پدې وسیله کې زېرمې شوې ښکاري.';

  @override
  String get ordersDetailTitle => 'د سفارش جزئیات';

  @override
  String get ordersSectionLive => 'اوسنی حالت';

  @override
  String get ordersSectionRecord => 'رسيډ';

  @override
  String get ordersCopyReference => 'حواله کاپي';

  @override
  String get ordersReferenceCopied => 'حواله کاپي شوه';

  @override
  String get trackingHeadlineCancelled => 'دا سفارش لغوه شو';

  @override
  String get trackingBodyCancelled =>
      'د دې سفارش لپاره تادیه بشپړه نه شوه. تاسو کولی شئ نوي ټاپ‌آپ پیل کړئ.';

  @override
  String ordersLastUpdated(String time) {
    return 'تازه $time';
  }

  @override
  String get orderStatusDelivered => 'ورسوول شو';

  @override
  String get orderStatusInProgress => 'پروسه کې';

  @override
  String get orderStatusRetrying => 'بیا هڅه';

  @override
  String get orderStatusFailed => 'پاملرنه پکار';

  @override
  String get orderStatusPaymentPending => 'تادیه تاییدېږي';

  @override
  String get orderStatusCancelled => 'لغوه شو';

  @override
  String get orderStatusSending => 'لیږل کېږي';

  @override
  String get orderStatusVerifying => 'تحویل تاییدېږي';

  @override
  String get orderStatusPreparing => 'چمتو کېږي';

  @override
  String get hubTileOrdersTitle => 'وروستي سفارشونه';

  @override
  String get hubTileOrdersSub => 'رسيډونه · د ننوتلو وروسته حساب سره';

  @override
  String get receiptPaymentPaid => 'ورکړل شو';

  @override
  String get receiptPaymentPending => 'تایید کېږي';

  @override
  String get receiptFulfillmentDone => 'لیږل شو';

  @override
  String get receiptFulfillmentProgress => 'پروسس کې';

  @override
  String get receiptCarrierRef => 'د اپراتور حواله';

  @override
  String get rechargeFailureCalmTitle => 'چیک‌آوت نه بشپړ شو';

  @override
  String get rechargeFailureCalmBody =>
      'هیڅ نه اخیستل شو. اړیکه وګورئ او بیا هڅه وکړئ — ستاسو جزئیات دلته دي.';

  @override
  String get checkoutTrustCallout =>
      'تادیه په خوندي Stripe پاڼه کې ځي. ستاسو کارت زموږ په سرورونو کې لا نه تیرېږي.';

  @override
  String get loyaltyHubTitle => 'کورنۍ پیژندنه';

  @override
  String get loyaltyHubSubtitle =>
      'د بشپړو ټاپ‌اپونو څخه نومرې ترلاسه کړئ — قرعه یا لوبه نشته.';

  @override
  String get loyaltyLifetimePoints => 'ټولې نومرې';

  @override
  String get loyaltyMonthPoints => 'دا میاشت';

  @override
  String get loyaltyMonthRank => 'میاشتنی درجه';

  @override
  String get loyaltyGroupPoints => 'د کورنۍ ډلې نومرې';

  @override
  String get loyaltyGroupRank => 'د ډلې درجه';

  @override
  String get loyaltyLeaderboardTab => 'لیدر بورډ';

  @override
  String get loyaltyYouTab => 'تاسو او کورنۍ';

  @override
  String get loyaltyTopGroups => 'مشتری ډلې';

  @override
  String get loyaltyTopMembers => 'فعاله برخه اخیستونکي';

  @override
  String get loyaltyRecognitionBand => 'پیژندنې کچه';

  @override
  String get loyaltyProgressClimb =>
      'له وړو سفارشونو سره پورته شئ — هیڅ تصادف نشته.';

  @override
  String get loyaltyLegalFootnote =>
      'نومرې یوازې له بریالۍ غوښتنو څخه دي؛ قرعه نشته.';

  @override
  String get loyaltyCreateGroup => 'کورنۍ ډله جوړه کړئ';

  @override
  String get loyaltyJoinGroup => 'د بلنې کوډ سره یوځای شئ';

  @override
  String get loyaltyInviteHint =>
      'یوازې مالک کوډ شري کولی شي — په مطمېن چو کې وساتئ.';

  @override
  String get loyaltyDissolveGroup => 'ډله پای ته ورسوئ';

  @override
  String get loyaltyLeaveGroup => 'ډله پرېږدئ';

  @override
  String get loyaltyRefresh => 'تازه';

  @override
  String get hubTileLoyaltyTitle => 'کورنۍ پیژندنه';

  @override
  String get hubTileLoyaltySub => 'نومرې · لیدر بورډ · بلنې';

  @override
  String loyaltyDaysLeft(int days) {
    return 'پدې میاشت کې $days ورځې پاتې';
  }

  @override
  String loyaltyPointsToRankAhead(int points, int rank) {
    return '$points نومرې تر #$rank';
  }

  @override
  String loyaltyRanksToTier(int ranks, String tier) {
    return '$ranks درجې تر $tier';
  }

  @override
  String loyaltyYouPlacement(String label) {
    return '$label دا میاشت';
  }

  @override
  String get loyaltyTightBehind =>
      'وروسته پر مخ نږدې دي — دوامدار سفارش ستاسو ځای ساتي.';

  @override
  String loyaltyChasingPack(int rank, int pts) {
    return '#$rank د $pts نومرو په فاصله کې دی';
  }

  @override
  String get loyaltyProgressYourMonthTitle => 'ستاسو میاشتنی حرکت';

  @override
  String get loyaltyProgressGroupTitle => 'د کورنۍ میاشتنی حرکت';

  @override
  String get loyaltyProgressTierTitle => 'بل پوښ ته لاره';

  @override
  String get loyaltyProgressRankTitle => 'په مخکینۍ درجه نږدې کېدل';

  @override
  String loyaltyGroupBoardGap(int pts) {
    return '$pts نومرې مخکې ډلو ته';
  }

  @override
  String loyaltyYourShareOfFamily(int pct) {
    return 'د کورنۍ د میاشتې برخه ستاسو: $pct٪';
  }

  @override
  String get loyaltySoloFamilyMonth => 'تاسو د کورنۍ د میاشتې ریتم ټاکئ.';

  @override
  String get loyaltyCarryingMost => 'د میاشتې زیاته فعالیت ستاسو ده.';

  @override
  String get loyaltyAchievementsHeading => 'پړاوونه';

  @override
  String get loyaltyAchFirstOrderTitle => 'لومړۍ وړه غوښتنه';

  @override
  String get loyaltyAchFirstOrderSub =>
      'پېژندنه له یو بشپړ ټاپ‌آپ څخه پیل کېږي.';

  @override
  String get loyaltyAchCenturyTitle => '۱۰۰ تلپاتې نمرې';

  @override
  String get loyaltyAchCenturySub => 'استقامت ارزښت لري — مننه.';

  @override
  String get loyaltyAchGroupTitle => 'کورنۍ مدار';

  @override
  String get loyaltyAchGroupSub => 'ستاسو ډله یو ګډ پوړ ته ورسېدله.';

  @override
  String get loyaltyRankBadge => 'درجه';

  @override
  String get notifOrderPaymentTitle => 'تادیه تایید شوه';

  @override
  String get notifOrderPaymentBody =>
      'ستاسو ټاپ‌آپ ثبت دی — موږ لیږد چمتو کوو.';

  @override
  String get notifOrderPreparingTitle => 'ټاپ‌آپ چمتو کېږي';

  @override
  String get notifOrderPreparingBody =>
      'د هغه اپراتور سره سمون — څه چې تاسو ټاکلی.';

  @override
  String get notifOrderSendingTitle => 'اپراتور ته لیږل';

  @override
  String get notifOrderSendingBody =>
      'اعتبار په لاره کې دی — ډېر وخت په څو دقو کې.';

  @override
  String get notifOrderDeliveredTitle => 'ورسېدل';

  @override
  String get notifOrderDeliveredBody =>
      'په لیکه کې ښکاري — رسيډ لپاره څرګند کړئ.';

  @override
  String get notifOrderRetryingTitle => 'نور یو شیبه';

  @override
  String get notifOrderRetryingBody => 'شبکې بیا هڅه غوښتله — موږ په اتومات.';

  @override
  String get notifOrderFailedTitle => 'موږ سره یاست';

  @override
  String get notifOrderFailedBody =>
      'ستاسو تادیه خوندي ده — ارام ګامونه خلاص کړئ.';

  @override
  String get notifInboxTitle => 'تازه پیغامونه';

  @override
  String get notifInboxEmpty => 'ټول تازه دي.';

  @override
  String get notifHubTooltip => 'خبرتیاوې';

  @override
  String get notifLoyaltyRankUpTitle => 'پورته مو ځای';

  @override
  String get notifLoyaltyRankUpBody =>
      'میاشتنی درجه ښه شوه — کورنۍ پیژندنه وګورئ.';

  @override
  String get notifLoyaltyRankDownTitle => 'جدول بدل شو';

  @override
  String get notifLoyaltyRankDownBody =>
      'نور مخکې دي — دوامدار فعالیت مرسته کوي.';

  @override
  String get notifLoyaltyMilestoneTitle => 'د نمرو ټک';

  @override
  String get notifLoyaltyMilestoneBody =>
      'یو پړاو مو ترلاسه کړ — په کورنۍ پیژندنه کې.';

  @override
  String get notifLoyaltyMonthUrgencyTitle => 'میاشت نږدې پای ته';

  @override
  String get notifLoyaltyMonthUrgencyBody =>
      'څو ورځې پاتې د میاشتې درجه ټینګولو لپاره.';

  @override
  String get notifMarkAllRead => 'ټول لوستل شوي';

  @override
  String get helpCenterTitle => 'مرستې مرکز';

  @override
  String get helpCenterSubtitle =>
      'د تادیې، تحویلي او غوښتنو په اړه روښانه ځوابونه — په ساده ژبه.';

  @override
  String get helpSectionPaymentTitle => 'د تادیې خونديتوب';

  @override
  String get helpSectionPaymentBody =>
      'تادیه په Stripe خوندي پاڼه کې کېږي. Zora-Walat ستاسو بشپړه کارت نه ګوري او نه ساتي. که بانک تراکنش ښيي، یعنی هغه پیرود چې تاسو یې پخلی کړی.';

  @override
  String get helpSectionDeliveryTitle => 'د تحویلي وخت';

  @override
  String get helpSectionDeliveryBody =>
      'ډېر افغان موبایل ټاپ‌آپ په څو دقو کې بشپړېږي؛ کله اپراتور نور وخت غواړي. د غوښتنې پاډه راکش کړئ — حالت ژر تر ژره توافقي کېږي.';

  @override
  String get helpSectionRetryTitle => 'بیا هڅه او لنډ ځنډ';

  @override
  String get helpSectionRetryBody =>
      'کله شبکې بیا هڅه غواړي — زموږ سیسټم اتومات اداره کوي. بیا تادیه نه غواړي. که غیرمعمول وخت ونیسي، تادیه خوندي پاتې ده تر همغږۍ.';

  @override
  String get helpSectionTrackingTitle => 'د غوښتنې تعقیب';

  @override
  String get helpSectionTrackingBody =>
      'پړاوونه د اپراتور ته ورته دي: تادیه، چمتو کېدل، اپراتور ته لیږل، بیا تحویل. هر هغه څه چې پاملرنه غواړي ښکاره دي — بې ټکنیکي ګډوډۍ.';

  @override
  String get helpSectionLoyaltyTitle => 'جایزې او کورنۍ نمرې';

  @override
  String get helpSectionLoyaltyBody =>
      'بریالي ټاپ‌آپونه ستاسو او اختیاري کورنۍ ډلې لپاره نمرې ډکوي؛ قرعه نشته — ځای په لیدر بورډ کې واقعي فعالیت ښيي.';

  @override
  String get helpSectionContactTitle => 'اړیکه او بل ګام';

  @override
  String get helpSectionContactBody =>
      'هرې غوښتنې ته لاړ شئ او «د مرستې لپاره کاپی» فشار ورکړئ — د غوښتنې شمېره، شبکه، ماسک شمېره، حالتونه او وخت په یوه کې.';

  @override
  String get helpOpenLoyalty => 'کورنۍ پیژندنه خلاصه کړئ';

  @override
  String get supportNeedHelp => 'مرستې ته اړتیا لرئ؟';

  @override
  String get supportOpenHelpCenter => 'مرستې مرکز';

  @override
  String get supportCopyPacket => 'د مرستې لپاره کاپی';

  @override
  String get supportPacketCopied => 'د مرستې لنډیز کاپی شو';

  @override
  String get supportPacketHeader => 'Zora-Walat — د مرستې لنډیز';

  @override
  String get supportPacketOrderRef => 'د غوښتنې مرجع';

  @override
  String get supportPacketRoute => 'لاره';

  @override
  String get supportPacketRouteValue => 'موبایل ټاپ‌آپ (ایرټایم / ډېټا)';

  @override
  String get supportPacketRecipient => 'ترلاسه‌کوونکی (ماسک شوی)';

  @override
  String get supportPacketUpdated => 'وروستی تازه';

  @override
  String get supportAssistRetryingTitle => 'موږ په اوتومات بیا هڅه کوو';

  @override
  String get supportAssistRetryingBody =>
      'اپراتور شبکې بله هڅه غوښتله — دا عام دی؛ بیا تادیه یا نو پیل نه غواړي.';

  @override
  String get supportAssistRetryingNext =>
      'څو دقې وګورئ، بیا پاډه راکش کړئ چې تازه شي.';

  @override
  String get supportAssistDelayedTitle => 'لا هم همغږۍ کې';

  @override
  String get supportAssistDelayedBody =>
      'همغږۍ یا تحویل یو څه نور وخت نیسي؛ تادیه ثبت ده او ورکه نه کېږي.';

  @override
  String get supportAssistDelayedNext =>
      'پاډه تازه کړئ، تازه غوښتنې وګورئ؛ که امر وي ننوځئ چې ژوندی حالت راشي.';

  @override
  String get supportAssistFailedTitle => 'په پاملرنې سره ګورو';

  @override
  String get supportAssistFailedBody =>
      'لومړۍ لاره بشپړه نه شوه خو تادیه خوندي ده — د مرجع سره همغږي کېدی شي؛ ویډه یا تکرار تادیه نه.';

  @override
  String get supportAssistFailedNext =>
      'د مرستې لنډیز کاپی کړئ او د مرستې غوښتنې سره یې شریک کړئ.';

  @override
  String get supportAssistPaymentConfirmTitle => 'تادیه لا تاييدېږي';

  @override
  String get supportAssistPaymentConfirmBody =>
      'ستاسو بانک یا کارت شبکه اجازه بشپړوي — یو شیبه کېدی شي. تر بشپړ تايید لیږد نه پیلېږي او دوه چارج نه.';

  @override
  String get supportAssistPaymentConfirmNext =>
      'لنډه همینجا پاتې شئ؛ که پاتې شو، یو دقیقه وروسته تازه کړئ.';

  @override
  String get supportAssistOperatorTitle => 'د اپراتور تايید ته انتظار';

  @override
  String get supportAssistOperatorBody =>
      'زموږ لوري اعتبار اپراتور ته رسېدلی؛ ډېر ژر تأیید کېږي، ځینې شبکې ګډې راپور ورکوي.';

  @override
  String get supportAssistOperatorNext =>
      'څو دقې او تازه کفایت کوي؛ اړتیا کې د شبکې په واسطه بیلانس وګورئ.';

  @override
  String get supportAssistVerifyingTitle => 'لا ټینګ تایید کېږي';

  @override
  String get supportAssistVerifyingBody =>
      'ستاسو بدلي خوندي ده. اپراتور لا وروستۍ تایید ورکوي — نو د حدس پرځای دقق سفارش په بېرته ګورن کې ساتو؛ هیڅ شی ورکه نه کېږي.';

  @override
  String get supportAssistVerifyingNext =>
      'څو دقې صبر، وروستي سفارشونه تازه کړئ؛ که غیرمعمول وخت ونیسي د مرستې سره د سفارش شمېره شریک کړئ.';

  @override
  String get supportAssistCancelledTitle => 'غوښتنه لغوه شوه';

  @override
  String get supportAssistCancelledBody =>
      'دغه ناسته ګان د بریالي چارج دمخه ودرېدله؛ هر وخت نوی ټاپ‌آپ پیلولی شئ — هیڅ پاتې نه.';

  @override
  String get supportAssistCancelledNext =>
      'بیا ټاپ‌آپ ته لاړ شئ، شمېره چمتو کړئ او اړتیا کې بیا تادیه.';

  @override
  String get supportReassuranceFooter =>
      'د تادیې خوندیتوب او څېړنه زموږ خوا ده — رښتینی حالت دلته دی.';

  @override
  String get supportOrderListHelpTooltip => 'لارښود';

  @override
  String get hubTileHelpTitle => 'مرسته او ملاتړ';

  @override
  String get hubTileHelpSub => 'لارښودونه · تادیه · د غوښتنې کاپی';

  @override
  String get ordersDetailLoadingHint => 'رسيډ بارېږي…';

  @override
  String get ordersEmptySupportLine =>
      'پوښتنې لرئ؟ له کور څخه «مرسته او ملاتړ» خلاص کړئ.';

  @override
  String get referralCenterTitle => 'بلنه او جایزه';

  @override
  String get referralCenterSubtitle =>
      'د هغو خلکو سره Zora-Walat شریک کړئ چې باور پرې لرئ. روښانه جایزې، صادق قواعد — د هغو کورنیو لپاره چې له بهر څخه ټاپ‌آپ کوي.';

  @override
  String get referralTrustLine =>
      'کله ستاسو ملګري لومړۍ بریالۍ ډالۍ بشپړه شي، جایزې په اتومات ډول تایید کېږي — نه ننداره؛ د ټولنې پراختیا ته مننه.';

  @override
  String get referralProgramPaused =>
      'اوس بلنې ودرول شوې. وروسته راګرځئ — کله بیا پرانیستل شي خبر درشو.';

  @override
  String get referralYourCode => 'ستاسو د بلنې کوډ';

  @override
  String get referralCopyCode => 'کوډ کاپی';

  @override
  String get referralCodeCopied => 'کوډ کاپی شو';

  @override
  String get referralCopyInviteMessage => 'د بلنې پیام کاپی';

  @override
  String get referralInviteMessageCopied => 'د بلنې پیام کاپی شو';

  @override
  String referralInviteMessageTemplate(String code) {
    return 'زه د افغانستان موبایل مطمین ټاپ‌آپ لپاره Zora-Walat کاروم. زما کوډ سره ګډ شئ: $code';
  }

  @override
  String get referralHowItWorksTitle => 'جایزې څنګه کار کوي';

  @override
  String referralHowItWorksBody(String rewardUsd, String minUsd) {
    return 'که ملګری ستاسو کوډ سره ننوځي او لومړۍ ډالۍ یې په بریالیتوب سره ورسېږي — لږترلږه $minUsd — تاسو $rewardUsd د والټ کرېډیټ ترلاسه کوئ راتلونکي پیرودونو لپاره. هر ملګري ته یو ځل جایزه.';
  }

  @override
  String get referralRewardRulesFootnote =>
      'د بلنې کرېډیټ یوازې ټاپ‌آپ لپاره دي؛ نغدي نشي اخیستل کیدی. دا د ټولو لپاره ښه او نرخونو ته انصاف دی.';

  @override
  String get referralWeeklyFairTitle => 'هره اونۍ عادلانه برخه';

  @override
  String get referralWeeklyFairBody =>
      'د بلنې جایزې له ګډې اونۍ زېرمې راځي ترڅو ډېرې کورنې برخه واخلي. که اونۍ ګډوډه وي، ځینې بلنې بیا هم وړ کیدی شي پداسې حال کې چې زېرمه نوې کېږي — ستاسو ملګري بیا هم هغه خدمت ترلاسه کوي چې تادیه یې کړې.';

  @override
  String get referralStatsInvited => 'بلل شوی';

  @override
  String get referralStatsSuccessful => 'بریالی';

  @override
  String get referralStatsEarned => 'ترلاسه شوی';

  @override
  String get referralHistoryTitle => 'ستاسو بلنې';

  @override
  String get referralHistoryEmpty =>
      'کله کوډ شریک کړئ، هر ملګری دلته له ساده حالت سره ښکیږي.';

  @override
  String get referralStatusPending => 'پر مخ';

  @override
  String get referralStatusCompleted => 'وړ';

  @override
  String get referralStatusRewarded => 'جایزه ورکړل شوه';

  @override
  String get referralStatusRejected => 'بې جایزې';

  @override
  String get referralPendingHint =>
      'د ملګري لومړۍ بریالۍ ډالۍ د پای ته رسېدو تمه کوو.';

  @override
  String get referralCompletedHint => 'وړ — ستاسو جایزه نهایی کېږي.';

  @override
  String get referralRewardedHint =>
      'مننه — کرېډیټ ستاسو والټ کې د راتلونکو ټاپ‌آپونو لپاره دی.';

  @override
  String get referralRejectedDetailBudget =>
      'د دې اونۍ د بلنې جایزې له مخکې ویشل شوې وې. ستاسو ملګري خدمت ترلاسه کوي — د Zora-Walat شریکولو مننه.';

  @override
  String get referralRejectedDetailWeeklyCap =>
      'د دې اونۍ د بلنې جایزنې حد ته رسېدلي. بله اونۍ بیا بلنه کولی شئ.';

  @override
  String get referralRejectedDetailLifetimeCap =>
      'د حساب لپاره اوږدمهال د بلنې جایزې حد ته رسېدلي. له همکارۍ مننه.';

  @override
  String get referralRejectedDetailNotEligible =>
      'دا بلنه د جایزې لارښودونو سره نه وه ګوندې. ملګری بیا هم عادي کارولی شي.';

  @override
  String get referralRejectedDetailGeneric =>
      'دا بلنه جایزه ونه ګټله. پوښتنې لرئ؟ ننوځئ او «مرسته» خلاص کړئ.';

  @override
  String referralRewardAmountLine(String amount) {
    return 'جایزه: $amount';
  }

  @override
  String get hubTileReferralTitle => 'بلنه او جایزه';

  @override
  String get hubTileReferralSub => 'کوډ شریک کړئ · والټ کرېډیټ';
}
