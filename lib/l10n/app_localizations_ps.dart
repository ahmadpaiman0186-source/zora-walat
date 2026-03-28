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
      'پرمختللونکي: STRIPE_PUBLISHABLE_KEY او PAYMENTS_API_BASE_URL په build کې ورکړئ.';

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
  String get paymentSuccessTitle => 'تادیه بریالۍ';

  @override
  String get paymentSuccessBody =>
      'مننه. ستاسو تادیه تایید شوه؛ اپراتور تحویل ژر کېږي.';

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
}
