// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Zora-Walat';

  @override
  String get language => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageDari => 'Dari';

  @override
  String get languagePashto => 'Pashto';

  @override
  String get chooseLanguageTitle => 'Choose language';

  @override
  String get languageSheetSubtitle =>
      'English, Dari, and Pashto are fully supported.';

  @override
  String get done => 'Done';

  @override
  String get cancel => 'Cancel';

  @override
  String get help => 'Help';

  @override
  String get refresh => 'Refresh';

  @override
  String get wallet => 'Wallet';

  @override
  String get more => 'More';

  @override
  String get loading => 'Loading…';

  @override
  String get processing => 'Processing…';

  @override
  String get rechargeTitle => 'Mobile recharge';

  @override
  String get rechargeHero =>
      'Send airtime or data to Afghanistan numbers in USD. Fast, transparent, and built for trust when you top up from the US, Canada, UK, or Europe.';

  @override
  String get recipientNumber => 'Recipient number';

  @override
  String get operator => 'Operator';

  @override
  String get getPackages => 'Get packages';

  @override
  String get packages => 'Packages';

  @override
  String packageOptionsCount(int count) {
    return '$count options';
  }

  @override
  String get enterRecipientError => 'Enter a recipient number.';

  @override
  String get noPackagesForOperator =>
      'No packages are available for this operator right now.';

  @override
  String get orderPlacedDefault => 'Order placed';

  @override
  String confirmMockSnack(String label) {
    return '$label · confirmed';
  }

  @override
  String get tapGetPackagesHint =>
      'Tap Get packages to load live offers for this number.';

  @override
  String get airtimeLabel => 'Airtime';

  @override
  String get dataBundleLabel => 'Data bundle';

  @override
  String get amountLabel => 'Amount';

  @override
  String get priceLabel => 'Price';

  @override
  String get buyLabel => 'Buy';

  @override
  String get apiUnreachableRecharge =>
      'We can’t reach the service. Check your connection and try again.';

  @override
  String get hubSubtitle => 'Recharge · Wallet · Calling';

  @override
  String get hubTileRechargeTitle => 'Mobile recharge';

  @override
  String get hubTileRechargeSub => 'Instant packages · USD pricing';

  @override
  String get hubTileWalletTitle => 'Wallet';

  @override
  String get hubTileWalletSub => 'Balance & top-up';

  @override
  String get hubTileCallingTitle => 'International calling';

  @override
  String get hubTileCallingSub => 'Coming soon';

  @override
  String get hubTileLegacyTitle => 'Plans & catalog';

  @override
  String get hubTileLegacySub => 'Airtime & data';

  @override
  String get walletScreenTitle => 'Wallet';

  @override
  String get balanceHeroLabel => 'Account balance';

  @override
  String get availableLabel => 'Available';

  @override
  String get quickTopUp => 'Quick top-up';

  @override
  String get walletTopUpHint =>
      'Add funds securely. Credits apply instantly for testing your integration.';

  @override
  String topUpSuccessSnack(String amount) {
    return 'Added $amount · balance updated';
  }

  @override
  String get apiUnreachableWallet =>
      'We can’t reach the service. Check your connection and try again.';

  @override
  String get telecomHomeSubtitle =>
      'Afghanistan mobile · USD checkout · Secure payments';

  @override
  String get aboutTitle => 'About Zora-Walat';

  @override
  String get aboutBody =>
      'Pricing is shown in USD. Card payments are processed securely; airtime and data are delivered through your configured carrier integrations.';

  @override
  String get aboutDevHint =>
      'Developers: pass STRIPE_PUBLISHABLE_KEY and PAYMENTS_API_BASE_URL at build time.';

  @override
  String get tabAirtime => 'Airtime';

  @override
  String get tabDataPackages => 'Data packages';

  @override
  String get tabIntlCalling => 'Int\'l calling';

  @override
  String get callingTitle => 'International calling';

  @override
  String get callingBody =>
      'We’re building international calling with the same secure checkout you use for recharge.\nCheck back soon.';

  @override
  String get missingOrder =>
      'We couldn’t open this order. Go back and try again.';

  @override
  String get paymentSuccessTitle => 'Payment successful';

  @override
  String get paymentSuccessBody =>
      'Thank you. Your payment is confirmed; carrier delivery completes on our side shortly.';

  @override
  String get paymentCancelled => 'Payment cancelled';

  @override
  String get reviewPayTitle => 'Review & pay';

  @override
  String get orderSummary => 'Order summary';

  @override
  String get serviceLabel => 'Service';

  @override
  String get phoneNumberLabel => 'Phone number';

  @override
  String get operatorLabel => 'Operator';

  @override
  String get packageLabel => 'Package';

  @override
  String get totalUsd => 'Total (USD)';

  @override
  String get stripeSectionTitle => 'Secure payment';

  @override
  String get stripeKeyMissing =>
      'Stripe publishable key not configured for this build.';

  @override
  String get stripeKeyLoaded =>
      'Card payments ready. Your server creates the PaymentIntent and returns the client secret.';

  @override
  String get payWithStripe => 'Pay with card';

  @override
  String get lineAirtime => 'Airtime';

  @override
  String get lineDataPackage => 'Data package';

  @override
  String get lineInternational => 'International';

  @override
  String get telecomAirtimeHeadline => 'Mobile recharge';

  @override
  String get telecomAirtimeSubtitle =>
      'Top up Afghan Wireless, MTN, Etisalat, or Roshan. Prices in USD with secure checkout.';

  @override
  String get telecomSelectOperatorSnack =>
      'Select a network or enter a number we recognize.';

  @override
  String get telecomChooseAmountSnack => 'Choose an amount to continue.';

  @override
  String telecomDetectedOperator(String name) {
    return 'Detected: $name';
  }

  @override
  String get telecomPrefixUnknown =>
      'Prefix not recognized — choose an operator below.';

  @override
  String get telecomUseAutoDetect => 'Use auto-detect';

  @override
  String get telecomMinuteBundlesTitle => 'Minute bundles (USD)';

  @override
  String get telecomEnterNumberForAmounts =>
      'Enter a valid number and confirm the operator to see amounts.';

  @override
  String get telecomPhoneHintAirtime => '07X XXX XXXX or 937…';

  @override
  String get telecomDataHeadline => 'Data packages';

  @override
  String get telecomDataSubtitle =>
      'Daily, weekly, and monthly bundles. All prices in USD.';

  @override
  String get telecomPhoneHintData => '07X XXX XXXX';

  @override
  String get intlTabHeadline => 'International calling';

  @override
  String get intlTabBody =>
      'Coming soon: global minutes and long-distance bundles with the same secure card checkout.';

  @override
  String get periodDaily => 'Daily';

  @override
  String get periodWeekly => 'Weekly';

  @override
  String get periodMonthly => 'Monthly';

  @override
  String get bestValueBadge => 'Best value';

  @override
  String get telecomVoiceBundle => 'Voice';

  @override
  String telecomMarginNote(String pct) {
    return '≥$pct% min. margin';
  }
}
