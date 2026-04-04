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
  String get splashTagline =>
      'Afghanistan mobile top-up from abroad. Secure, clear, and fast.';

  @override
  String get languageOnboardingSubtitle =>
      'You can change this anytime from the language menu.';

  @override
  String get selectAmount => 'Amount (USD)';

  @override
  String get continueCta => 'Continue';

  @override
  String get rechargeReviewTitle => 'Review';

  @override
  String get rechargeReviewSubtitle =>
      'Confirm these details before you pick a package.';

  @override
  String get continueToPlans => 'Continue to plans';

  @override
  String get rechargeReviewStripeHint =>
      'Pay securely with Apple Pay / Google Pay or card. Your card details never touch our servers.';

  @override
  String paymentPayWithCard(String amount) {
    return 'Pay $amount';
  }

  @override
  String get paymentPreparing => 'Preparing secure checkout…';

  @override
  String get paymentSuccessTitle => 'Payment successful';

  @override
  String get paymentSuccessBody =>
      'You returned from Stripe after checkout. This screen is for your convenience only — payment confirmation is processed on our servers (not from this page alone). Carrier delivery follows after verification.';

  @override
  String get paymentFailedTitle => 'Payment failed';

  @override
  String get paymentCancelledTitle => 'Payment cancelled';

  @override
  String get paymentCancelledBody =>
      'No charge was made. You can try again when ready.';

  @override
  String get paymentCheckoutRedirectTitle => 'Stripe Checkout';

  @override
  String get paymentCheckoutRedirectBody =>
      'Complete payment on the next page. When you return here, confirmation may take a moment.';

  @override
  String get paymentTryAgain => 'Try again';

  @override
  String get paymentBackToReview => 'Edit details';

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
  String get rechargeTrustLine =>
      'USD pricing · Secure checkout · Afghanistan mobile';

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
      'Developers: set the Stripe publishable key in lib/stripe_keys.dart; pass PAYMENTS_API_BASE_URL at build time if your API is not localhost.';

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

  @override
  String get phoneValidationEmpty => 'Enter a mobile number.';

  @override
  String get phoneValidationInvalid =>
      'Enter a valid Afghanistan mobile number.';

  @override
  String get phoneValidationLength =>
      'Number should be 9–10 digits (after 7…).';

  @override
  String get phoneValidationPrefix => 'Afghan mobile numbers start with 7.';

  @override
  String get phoneValidationFormat => 'Invalid mobile format.';

  @override
  String get telecomNoDataPackages =>
      'No data packages for this operator right now. Try another network or check back later.';

  @override
  String dataVolumeGb(String n) {
    return '$n GB';
  }

  @override
  String dataVolumeMb(String n) {
    return '$n MB';
  }

  @override
  String get validityOneDay => '1 day';

  @override
  String get validity7Days => '7 days';

  @override
  String get validity30Days => '30 days';

  @override
  String validityNDays(String n) {
    return '$n days';
  }

  @override
  String get currencyUsdHint => 'Prices in US dollars (USD).';

  @override
  String get actionRetry => 'Retry';

  @override
  String get telecomCatalogLoadError =>
      'We couldn’t load options. Check your connection and tap Retry.';

  @override
  String get telecomAirtimeEmpty =>
      'No amounts are available for this network right now.';

  @override
  String get telecomLoadingAmounts => 'Loading amounts…';

  @override
  String get checkoutYourOrder => 'Your order';

  @override
  String get checkoutPaymentSecureNote =>
      'You’ll pay on Stripe’s secure page. Your card details never pass through our servers.';

  @override
  String get telecomDataPackagesSectionTitle => 'Choose a package';

  @override
  String get telecomDataLoadingPackages => 'Loading packages…';

  @override
  String get authSignInTitle => 'Sign in';

  @override
  String get authRegisterTitle => 'Create account';

  @override
  String get authEmailLabel => 'Email';

  @override
  String get authPasswordLabel => 'Password';

  @override
  String get authSignInCta => 'Sign in';

  @override
  String get authRegisterCta => 'Register';

  @override
  String get authRegisterPasswordHint => 'Use at least 10 characters';

  @override
  String get authSwitchToRegister => 'Need an account? Register';

  @override
  String get authSwitchToSignIn => 'Already have an account? Sign in';

  @override
  String get authRequiredMessage => 'Please sign in to continue.';

  @override
  String get authSignOut => 'Sign out';

  @override
  String get authAccountTileTitle => 'Account';

  @override
  String get authAccountTileSignedInSub => 'Signed in';

  @override
  String get authAccountTileSignedOutSub => 'Sign in for wallet and payments';

  @override
  String get authGenericError => 'Something went wrong. Please try again.';

  @override
  String get authFillAllFields => 'Enter your email and password.';

  @override
  String get landingNavBrand => 'Zora-Walat';

  @override
  String get landingHeroTitle => 'Send airtime to Afghanistan in seconds';

  @override
  String get landingHeroSubtitle =>
      'International mobile top-up for Afghan numbers — built for families abroad who need a fast, trustworthy way to stay connected.';

  @override
  String get landingTrustBadge =>
      'USD pricing · Secure checkout · Built for the diaspora';

  @override
  String get landingCtaGetStarted => 'Get started';

  @override
  String get landingCtaSignIn => 'Sign in';

  @override
  String get landingLanguagesTitle => 'Languages';

  @override
  String get landingLanguagesBody =>
      'Full experience in English, Dari, and Pashto — switch anytime from the toolbar.';

  @override
  String get landingWhyTitle => 'Why Zora-Walat';

  @override
  String get landingWhyFastTitle => 'Fast top-up';

  @override
  String get landingWhyFastBody =>
      'Complete your purchase quickly and move from amount to package without friction.';

  @override
  String get landingWhySecureTitle => 'Secure payments';

  @override
  String get landingWhySecureBody =>
      'Checkout uses trusted card processing — your card details never touch our servers.';

  @override
  String get landingWhyPricingTitle => 'Transparent pricing';

  @override
  String get landingWhyPricingBody =>
      'See costs clearly in US dollars before you pay — no surprises at checkout.';

  @override
  String get landingWhyLangTitle => 'Multi-language experience';

  @override
  String get landingWhyLangBody =>
      'Use the app in English, Dari, or Pashto — whichever fits you and your family.';

  @override
  String get landingHowTitle => 'How it works';

  @override
  String get landingHowStep1Title => 'Enter the Afghan number';

  @override
  String get landingHowStep1Body =>
      'Choose the operator and amount in USD, or pick an airtime or data package.';

  @override
  String get landingHowStep2Title => 'Review and pay securely';

  @override
  String get landingHowStep2Body =>
      'Confirm details, then complete payment on Stripe’s hosted checkout — your card never touches our servers.';

  @override
  String get landingHowStep3Title => 'Top-up is delivered';

  @override
  String get landingHowStep3Body =>
      'We process your order and send credit to the recipient’s mobile line.';

  @override
  String get landingFooterNote => 'Zora-Walat · Afghanistan mobile top-up';
}
