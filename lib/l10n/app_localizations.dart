import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fa.dart';
import 'app_localizations_ps.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fa'),
    Locale('ps'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Zora-Walat'**
  String get appTitle;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageDari.
  ///
  /// In en, this message translates to:
  /// **'Dari'**
  String get languageDari;

  /// No description provided for @languagePashto.
  ///
  /// In en, this message translates to:
  /// **'Pashto'**
  String get languagePashto;

  /// No description provided for @chooseLanguageTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose language'**
  String get chooseLanguageTitle;

  /// No description provided for @splashTagline.
  ///
  /// In en, this message translates to:
  /// **'Afghanistan mobile top-up from abroad. Secure, clear, and fast.'**
  String get splashTagline;

  /// No description provided for @languageOnboardingSubtitle.
  ///
  /// In en, this message translates to:
  /// **'You can change this anytime from the language menu.'**
  String get languageOnboardingSubtitle;

  /// No description provided for @selectAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount (USD)'**
  String get selectAmount;

  /// No description provided for @continueCta.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueCta;

  /// No description provided for @rechargeReviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get rechargeReviewTitle;

  /// No description provided for @rechargeReviewSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm these details before you pick a package.'**
  String get rechargeReviewSubtitle;

  /// No description provided for @rechargeReviewServerPricingNote.
  ///
  /// In en, this message translates to:
  /// **'Airtime only. The total in USD is locked by our server when checkout starts — you complete payment on Stripe’s secure page.'**
  String get rechargeReviewServerPricingNote;

  /// No description provided for @continueToPlans.
  ///
  /// In en, this message translates to:
  /// **'Continue to plans'**
  String get continueToPlans;

  /// No description provided for @rechargeReviewStripeHint.
  ///
  /// In en, this message translates to:
  /// **'Pay securely with Apple Pay / Google Pay or card. Your card details never touch our servers.'**
  String get rechargeReviewStripeHint;

  /// No description provided for @paymentPayWithCard.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount}'**
  String paymentPayWithCard(String amount);

  /// No description provided for @paymentPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing secure checkout…'**
  String get paymentPreparing;

  /// No description provided for @paymentSuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment successful'**
  String get paymentSuccessTitle;

  /// No description provided for @paymentSuccessBody.
  ///
  /// In en, this message translates to:
  /// **'You returned from Stripe after checkout. This screen is for your convenience only — payment confirmation is processed on our servers (not from this page alone). Carrier delivery follows after verification.'**
  String get paymentSuccessBody;

  /// No description provided for @paymentFailedTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment failed'**
  String get paymentFailedTitle;

  /// No description provided for @paymentCancelledTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment cancelled'**
  String get paymentCancelledTitle;

  /// No description provided for @paymentCancelledBody.
  ///
  /// In en, this message translates to:
  /// **'No charge was made. You can try again when ready.'**
  String get paymentCancelledBody;

  /// No description provided for @paymentCheckoutRedirectTitle.
  ///
  /// In en, this message translates to:
  /// **'Stripe Checkout'**
  String get paymentCheckoutRedirectTitle;

  /// No description provided for @paymentCheckoutRedirectBody.
  ///
  /// In en, this message translates to:
  /// **'Complete payment on the next page. When you return here, confirmation may take a moment.'**
  String get paymentCheckoutRedirectBody;

  /// No description provided for @paymentTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get paymentTryAgain;

  /// No description provided for @paymentBackToReview.
  ///
  /// In en, this message translates to:
  /// **'Edit details'**
  String get paymentBackToReview;

  /// No description provided for @languageSheetSubtitle.
  ///
  /// In en, this message translates to:
  /// **'English, Dari, and Pashto are fully supported.'**
  String get languageSheetSubtitle;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @help.
  ///
  /// In en, this message translates to:
  /// **'Help'**
  String get help;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @wallet.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get wallet;

  /// No description provided for @more.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get more;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @processing.
  ///
  /// In en, this message translates to:
  /// **'Processing…'**
  String get processing;

  /// No description provided for @rechargeTitle.
  ///
  /// In en, this message translates to:
  /// **'Mobile recharge'**
  String get rechargeTitle;

  /// No description provided for @rechargeHero.
  ///
  /// In en, this message translates to:
  /// **'Send mobile airtime to Afghanistan numbers in USD. Fast, transparent, and built for trust when you top up from the US, Canada, UK, Europe, UAE, or Türkiye.'**
  String get rechargeHero;

  /// No description provided for @phase1OnlyAirtimeSnack.
  ///
  /// In en, this message translates to:
  /// **'Phase 1: only mobile airtime is available.'**
  String get phase1OnlyAirtimeSnack;

  /// No description provided for @phase1UsdSecureCheckout.
  ///
  /// In en, this message translates to:
  /// **'You pay in USD on Stripe’s secure checkout. The total is confirmed by our server before you are charged.'**
  String get phase1UsdSecureCheckout;

  /// No description provided for @checkoutCardRegionLabel.
  ///
  /// In en, this message translates to:
  /// **'Your location (card)'**
  String get checkoutCardRegionLabel;

  /// No description provided for @checkoutSenderCountryHint.
  ///
  /// In en, this message translates to:
  /// **'This is your card’s billing region for risk checks. It does not change the recipient number — Afghanistan mobile (+93) only.'**
  String get checkoutSenderCountryHint;

  /// No description provided for @telecomRecipientAfghanistanDialHint.
  ///
  /// In en, this message translates to:
  /// **'Afghanistan +93 — enter the local mobile (starts with 7).'**
  String get telecomRecipientAfghanistanDialHint;

  /// No description provided for @checkoutPricingUsdServerNote.
  ///
  /// In en, this message translates to:
  /// **'Pricing is calculated in USD on our servers for your region.'**
  String get checkoutPricingUsdServerNote;

  /// No description provided for @telecomCheckoutAirtimeRowLabel.
  ///
  /// In en, this message translates to:
  /// **'Airtime'**
  String get telecomCheckoutAirtimeRowLabel;

  /// No description provided for @phase1ValidityDependsOnOperator.
  ///
  /// In en, this message translates to:
  /// **'How long credit stays usable depends on the operator — we show it here only when we have a verified value from pricing.'**
  String get phase1ValidityDependsOnOperator;

  /// No description provided for @checkoutAirtimeAmountLine.
  ///
  /// In en, this message translates to:
  /// **'Send {amount} airtime'**
  String checkoutAirtimeAmountLine(String amount);

  /// No description provided for @rechargeTrustLine.
  ///
  /// In en, this message translates to:
  /// **'USD pricing · Secure checkout · Afghanistan mobile'**
  String get rechargeTrustLine;

  /// No description provided for @recipientNumber.
  ///
  /// In en, this message translates to:
  /// **'Recipient number'**
  String get recipientNumber;

  /// No description provided for @receivingCountryLabel.
  ///
  /// In en, this message translates to:
  /// **'Receiving country'**
  String get receivingCountryLabel;

  /// No description provided for @rechargeCountryNotSupported.
  ///
  /// In en, this message translates to:
  /// **'Mobile recharge supports Afghanistan numbers only. Select Afghanistan as the receiving country.'**
  String get rechargeCountryNotSupported;

  /// No description provided for @phoneLocalDigitsHint.
  ///
  /// In en, this message translates to:
  /// **'Enter the local number without country code.'**
  String get phoneLocalDigitsHint;

  /// No description provided for @operator.
  ///
  /// In en, this message translates to:
  /// **'Operator'**
  String get operator;

  /// No description provided for @getPackages.
  ///
  /// In en, this message translates to:
  /// **'Get packages'**
  String get getPackages;

  /// No description provided for @packages.
  ///
  /// In en, this message translates to:
  /// **'Packages'**
  String get packages;

  /// No description provided for @packageOptionsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} options'**
  String packageOptionsCount(int count);

  /// No description provided for @enterRecipientError.
  ///
  /// In en, this message translates to:
  /// **'Enter a recipient number.'**
  String get enterRecipientError;

  /// No description provided for @noPackagesForOperator.
  ///
  /// In en, this message translates to:
  /// **'No packages are available for this operator right now.'**
  String get noPackagesForOperator;

  /// No description provided for @orderPlacedDefault.
  ///
  /// In en, this message translates to:
  /// **'Order placed'**
  String get orderPlacedDefault;

  /// No description provided for @confirmMockSnack.
  ///
  /// In en, this message translates to:
  /// **'{label} · confirmed'**
  String confirmMockSnack(String label);

  /// No description provided for @tapGetPackagesHint.
  ///
  /// In en, this message translates to:
  /// **'Tap Get packages to load live offers for this number.'**
  String get tapGetPackagesHint;

  /// No description provided for @airtimeLabel.
  ///
  /// In en, this message translates to:
  /// **'Airtime'**
  String get airtimeLabel;

  /// No description provided for @dataBundleLabel.
  ///
  /// In en, this message translates to:
  /// **'Data bundle'**
  String get dataBundleLabel;

  /// No description provided for @amountLabel.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get amountLabel;

  /// No description provided for @priceLabel.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get priceLabel;

  /// No description provided for @buyLabel.
  ///
  /// In en, this message translates to:
  /// **'Buy'**
  String get buyLabel;

  /// No description provided for @apiUnreachableRecharge.
  ///
  /// In en, this message translates to:
  /// **'We can’t reach the service. Check your connection and try again.'**
  String get apiUnreachableRecharge;

  /// No description provided for @hubSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Recharge · Wallet · Calling'**
  String get hubSubtitle;

  /// No description provided for @hubTileRechargeTitle.
  ///
  /// In en, this message translates to:
  /// **'Mobile recharge'**
  String get hubTileRechargeTitle;

  /// No description provided for @hubTileRechargeSub.
  ///
  /// In en, this message translates to:
  /// **'Instant packages · USD pricing'**
  String get hubTileRechargeSub;

  /// No description provided for @hubTileWalletTitle.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get hubTileWalletTitle;

  /// No description provided for @hubTileWalletSub.
  ///
  /// In en, this message translates to:
  /// **'Balance & top-up'**
  String get hubTileWalletSub;

  /// No description provided for @hubTileCallingTitle.
  ///
  /// In en, this message translates to:
  /// **'International calling'**
  String get hubTileCallingTitle;

  /// No description provided for @hubTileCallingSub.
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get hubTileCallingSub;

  /// No description provided for @hubTileLegacyTitle.
  ///
  /// In en, this message translates to:
  /// **'Plans & catalog'**
  String get hubTileLegacyTitle;

  /// No description provided for @hubTileLegacySub.
  ///
  /// In en, this message translates to:
  /// **'Airtime & data'**
  String get hubTileLegacySub;

  /// No description provided for @walletScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get walletScreenTitle;

  /// No description provided for @balanceHeroLabel.
  ///
  /// In en, this message translates to:
  /// **'Account balance'**
  String get balanceHeroLabel;

  /// No description provided for @availableLabel.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get availableLabel;

  /// No description provided for @quickTopUp.
  ///
  /// In en, this message translates to:
  /// **'Quick top-up'**
  String get quickTopUp;

  /// No description provided for @walletTopUpHint.
  ///
  /// In en, this message translates to:
  /// **'Add funds securely. Credits apply instantly for testing your integration.'**
  String get walletTopUpHint;

  /// No description provided for @topUpSuccessSnack.
  ///
  /// In en, this message translates to:
  /// **'Added {amount} · balance updated'**
  String topUpSuccessSnack(String amount);

  /// No description provided for @apiUnreachableWallet.
  ///
  /// In en, this message translates to:
  /// **'We can’t reach the service. Check your connection and try again.'**
  String get apiUnreachableWallet;

  /// No description provided for @telecomHomeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Afghanistan mobile · USD checkout · Secure payments'**
  String get telecomHomeSubtitle;

  /// No description provided for @aboutTitle.
  ///
  /// In en, this message translates to:
  /// **'About Zora-Walat'**
  String get aboutTitle;

  /// No description provided for @aboutBody.
  ///
  /// In en, this message translates to:
  /// **'Pricing is shown in USD. Card payments are processed securely; airtime and data are delivered through your configured carrier integrations.'**
  String get aboutBody;

  /// No description provided for @aboutDevHint.
  ///
  /// In en, this message translates to:
  /// **'Developers: set the Stripe publishable key in lib/stripe_keys.dart; pass API_BASE_URL via --dart-define when using a non-default backend.'**
  String get aboutDevHint;

  /// No description provided for @tabAirtime.
  ///
  /// In en, this message translates to:
  /// **'Airtime'**
  String get tabAirtime;

  /// No description provided for @tabDataPackages.
  ///
  /// In en, this message translates to:
  /// **'Data packages'**
  String get tabDataPackages;

  /// No description provided for @tabIntlCalling.
  ///
  /// In en, this message translates to:
  /// **'Int\'l calling'**
  String get tabIntlCalling;

  /// No description provided for @callingTitle.
  ///
  /// In en, this message translates to:
  /// **'International calling'**
  String get callingTitle;

  /// No description provided for @callingBody.
  ///
  /// In en, this message translates to:
  /// **'We’re building international calling with the same secure checkout you use for recharge.\nCheck back soon.'**
  String get callingBody;

  /// No description provided for @missingOrder.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t open this order. Go back and try again.'**
  String get missingOrder;

  /// No description provided for @paymentCancelled.
  ///
  /// In en, this message translates to:
  /// **'Payment cancelled'**
  String get paymentCancelled;

  /// No description provided for @reviewPayTitle.
  ///
  /// In en, this message translates to:
  /// **'Review & pay'**
  String get reviewPayTitle;

  /// No description provided for @orderSummary.
  ///
  /// In en, this message translates to:
  /// **'Order summary'**
  String get orderSummary;

  /// No description provided for @serviceLabel.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get serviceLabel;

  /// No description provided for @phoneNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone number'**
  String get phoneNumberLabel;

  /// No description provided for @operatorLabel.
  ///
  /// In en, this message translates to:
  /// **'Operator'**
  String get operatorLabel;

  /// No description provided for @packageLabel.
  ///
  /// In en, this message translates to:
  /// **'Package'**
  String get packageLabel;

  /// No description provided for @totalUsd.
  ///
  /// In en, this message translates to:
  /// **'Total (USD)'**
  String get totalUsd;

  /// No description provided for @checkoutUsdTotalFootnote.
  ///
  /// In en, this message translates to:
  /// **'Charged in USD. If your card is not USD, your bank may add conversion or fees we do not control.'**
  String get checkoutUsdTotalFootnote;

  /// No description provided for @stripeSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Secure payment'**
  String get stripeSectionTitle;

  /// No description provided for @stripeKeyMissing.
  ///
  /// In en, this message translates to:
  /// **'Stripe publishable key not configured for this build.'**
  String get stripeKeyMissing;

  /// No description provided for @stripeKeyLoaded.
  ///
  /// In en, this message translates to:
  /// **'Card payments ready. Your server creates the PaymentIntent and returns the client secret.'**
  String get stripeKeyLoaded;

  /// No description provided for @payWithStripe.
  ///
  /// In en, this message translates to:
  /// **'Pay with card'**
  String get payWithStripe;

  /// No description provided for @lineAirtime.
  ///
  /// In en, this message translates to:
  /// **'Airtime'**
  String get lineAirtime;

  /// No description provided for @lineDataPackage.
  ///
  /// In en, this message translates to:
  /// **'Data package'**
  String get lineDataPackage;

  /// No description provided for @lineInternational.
  ///
  /// In en, this message translates to:
  /// **'International'**
  String get lineInternational;

  /// No description provided for @telecomAirtimeHeadline.
  ///
  /// In en, this message translates to:
  /// **'Mobile recharge'**
  String get telecomAirtimeHeadline;

  /// No description provided for @telecomAirtimeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Top up Afghan Wireless, MTN, Etisalat, or Roshan. Prices in USD with secure checkout.'**
  String get telecomAirtimeSubtitle;

  /// No description provided for @telecomSelectOperatorSnack.
  ///
  /// In en, this message translates to:
  /// **'Select a network or enter a number we recognize.'**
  String get telecomSelectOperatorSnack;

  /// No description provided for @telecomChooseAmountSnack.
  ///
  /// In en, this message translates to:
  /// **'Choose an amount to continue.'**
  String get telecomChooseAmountSnack;

  /// No description provided for @telecomDetectedOperator.
  ///
  /// In en, this message translates to:
  /// **'Detected: {name}'**
  String telecomDetectedOperator(String name);

  /// No description provided for @telecomPrefixUnknown.
  ///
  /// In en, this message translates to:
  /// **'Prefix not recognized — choose an operator below.'**
  String get telecomPrefixUnknown;

  /// No description provided for @telecomUseAutoDetect.
  ///
  /// In en, this message translates to:
  /// **'Use auto-detect'**
  String get telecomUseAutoDetect;

  /// No description provided for @telecomMinuteBundlesTitle.
  ///
  /// In en, this message translates to:
  /// **'Minute bundles (USD)'**
  String get telecomMinuteBundlesTitle;

  /// No description provided for @telecomEnterNumberForAmounts.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid number and confirm the operator to see amounts.'**
  String get telecomEnterNumberForAmounts;

  /// No description provided for @telecomPhoneHintAirtime.
  ///
  /// In en, this message translates to:
  /// **'07X XXX XXXX or 937…'**
  String get telecomPhoneHintAirtime;

  /// No description provided for @telecomDataHeadline.
  ///
  /// In en, this message translates to:
  /// **'Data packages'**
  String get telecomDataHeadline;

  /// No description provided for @telecomDataSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Daily, weekly, and monthly bundles. All prices in USD.'**
  String get telecomDataSubtitle;

  /// No description provided for @telecomPhoneHintData.
  ///
  /// In en, this message translates to:
  /// **'07X XXX XXXX'**
  String get telecomPhoneHintData;

  /// No description provided for @intlTabHeadline.
  ///
  /// In en, this message translates to:
  /// **'International calling'**
  String get intlTabHeadline;

  /// No description provided for @intlTabBody.
  ///
  /// In en, this message translates to:
  /// **'Coming soon: global minutes and long-distance bundles with the same secure card checkout.'**
  String get intlTabBody;

  /// No description provided for @periodDaily.
  ///
  /// In en, this message translates to:
  /// **'Daily'**
  String get periodDaily;

  /// No description provided for @periodWeekly.
  ///
  /// In en, this message translates to:
  /// **'Weekly'**
  String get periodWeekly;

  /// No description provided for @periodMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get periodMonthly;

  /// No description provided for @bestValueBadge.
  ///
  /// In en, this message translates to:
  /// **'Best value'**
  String get bestValueBadge;

  /// No description provided for @telecomVoiceBundle.
  ///
  /// In en, this message translates to:
  /// **'Voice'**
  String get telecomVoiceBundle;

  /// No description provided for @telecomMarginNote.
  ///
  /// In en, this message translates to:
  /// **'≥{pct}% min. margin'**
  String telecomMarginNote(String pct);

  /// No description provided for @phoneValidationEmpty.
  ///
  /// In en, this message translates to:
  /// **'Enter a mobile number.'**
  String get phoneValidationEmpty;

  /// No description provided for @phoneValidationInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid Afghanistan mobile number.'**
  String get phoneValidationInvalid;

  /// No description provided for @phoneValidationLength.
  ///
  /// In en, this message translates to:
  /// **'Number should be 9–10 digits (after 7…).'**
  String get phoneValidationLength;

  /// No description provided for @phoneValidationPrefix.
  ///
  /// In en, this message translates to:
  /// **'Afghan mobile numbers start with 7.'**
  String get phoneValidationPrefix;

  /// No description provided for @phoneValidationFormat.
  ///
  /// In en, this message translates to:
  /// **'Invalid mobile format.'**
  String get phoneValidationFormat;

  /// No description provided for @telecomNoDataPackages.
  ///
  /// In en, this message translates to:
  /// **'No data packages for this operator right now. Try another network or check back later.'**
  String get telecomNoDataPackages;

  /// No description provided for @dataVolumeGb.
  ///
  /// In en, this message translates to:
  /// **'{n} GB'**
  String dataVolumeGb(String n);

  /// No description provided for @dataVolumeMb.
  ///
  /// In en, this message translates to:
  /// **'{n} MB'**
  String dataVolumeMb(String n);

  /// No description provided for @validityOneDay.
  ///
  /// In en, this message translates to:
  /// **'1 day'**
  String get validityOneDay;

  /// No description provided for @validity7Days.
  ///
  /// In en, this message translates to:
  /// **'7 days'**
  String get validity7Days;

  /// No description provided for @validity30Days.
  ///
  /// In en, this message translates to:
  /// **'30 days'**
  String get validity30Days;

  /// No description provided for @validityNDays.
  ///
  /// In en, this message translates to:
  /// **'{n} days'**
  String validityNDays(String n);

  /// No description provided for @currencyUsdHint.
  ///
  /// In en, this message translates to:
  /// **'Prices in US dollars (USD).'**
  String get currencyUsdHint;

  /// No description provided for @actionRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get actionRetry;

  /// No description provided for @telecomCatalogLoadError.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t load options. Check your connection and tap Retry.'**
  String get telecomCatalogLoadError;

  /// No description provided for @telecomAirtimeEmpty.
  ///
  /// In en, this message translates to:
  /// **'No amounts are available for this network right now.'**
  String get telecomAirtimeEmpty;

  /// No description provided for @telecomLoadingAmounts.
  ///
  /// In en, this message translates to:
  /// **'Loading amounts…'**
  String get telecomLoadingAmounts;

  /// No description provided for @checkoutYourOrder.
  ///
  /// In en, this message translates to:
  /// **'Your order'**
  String get checkoutYourOrder;

  /// No description provided for @checkoutPaymentSecureNote.
  ///
  /// In en, this message translates to:
  /// **'You’ll pay on Stripe’s secure page. Your card details never pass through our servers.'**
  String get checkoutPaymentSecureNote;

  /// No description provided for @telecomDataPackagesSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a package'**
  String get telecomDataPackagesSectionTitle;

  /// No description provided for @telecomDataLoadingPackages.
  ///
  /// In en, this message translates to:
  /// **'Loading packages…'**
  String get telecomDataLoadingPackages;

  /// No description provided for @authSignInTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignInTitle;

  /// No description provided for @authRegisterTitle.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get authRegisterTitle;

  /// No description provided for @authEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmailLabel;

  /// No description provided for @authPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPasswordLabel;

  /// No description provided for @authSignInCta.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignInCta;

  /// No description provided for @authRegisterCta.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get authRegisterCta;

  /// No description provided for @authRegisterPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Use at least 10 characters'**
  String get authRegisterPasswordHint;

  /// No description provided for @authSwitchToRegister.
  ///
  /// In en, this message translates to:
  /// **'Need an account? Register'**
  String get authSwitchToRegister;

  /// No description provided for @authSwitchToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get authSwitchToSignIn;

  /// No description provided for @authRequiredMessage.
  ///
  /// In en, this message translates to:
  /// **'Please sign in to continue.'**
  String get authRequiredMessage;

  /// No description provided for @authSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get authSignOut;

  /// No description provided for @authAccountTileTitle.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get authAccountTileTitle;

  /// No description provided for @authAccountTileSignedInSub.
  ///
  /// In en, this message translates to:
  /// **'Signed in'**
  String get authAccountTileSignedInSub;

  /// No description provided for @authAccountTileSignedOutSub.
  ///
  /// In en, this message translates to:
  /// **'Sign in for wallet and payments'**
  String get authAccountTileSignedOutSub;

  /// No description provided for @authGenericError.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get authGenericError;

  /// No description provided for @authFillAllFields.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and password.'**
  String get authFillAllFields;

  /// No description provided for @authInvalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get authInvalidEmail;

  /// No description provided for @authEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your email address.'**
  String get authEmailRequired;

  /// No description provided for @authOtpEmailIntro.
  ///
  /// In en, this message translates to:
  /// **'Enter your email address and we’ll send a 6-digit sign-in code if the account is eligible.'**
  String get authOtpEmailIntro;

  /// No description provided for @authOtpEmailHelp.
  ///
  /// In en, this message translates to:
  /// **'Use the same email address you use for your Zora-Walat account.'**
  String get authOtpEmailHelp;

  /// No description provided for @authOtpContinueCta.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get authOtpContinueCta;

  /// No description provided for @authOtpCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter code'**
  String get authOtpCodeTitle;

  /// No description provided for @authOtpCheckEmail.
  ///
  /// In en, this message translates to:
  /// **'Check your inbox'**
  String get authOtpCheckEmail;

  /// No description provided for @authOtpCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get authOtpCodeLabel;

  /// No description provided for @authOtpVerifyCta.
  ///
  /// In en, this message translates to:
  /// **'Verify code'**
  String get authOtpVerifyCta;

  /// No description provided for @authOtpCodeRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit verification code.'**
  String get authOtpCodeRequired;

  /// No description provided for @authOtpInvalidOrExpired.
  ///
  /// In en, this message translates to:
  /// **'That code is invalid or has expired. Request a new code and try again.'**
  String get authOtpInvalidOrExpired;

  /// No description provided for @authOtpTooManyAttempts.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please wait a moment before trying again.'**
  String get authOtpTooManyAttempts;

  /// No description provided for @authNetworkRetry.
  ///
  /// In en, this message translates to:
  /// **'Network error. Check your connection and try again.'**
  String get authNetworkRetry;

  /// No description provided for @authOtpRequestSuccess.
  ///
  /// In en, this message translates to:
  /// **'If the account is eligible, a verification code has been sent.'**
  String get authOtpRequestSuccess;

  /// No description provided for @authOtpResendReady.
  ///
  /// In en, this message translates to:
  /// **'You can request a new code now.'**
  String get authOtpResendReady;

  /// No description provided for @authOtpResendCta.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get authOtpResendCta;

  /// No description provided for @authOtpChangeEmail.
  ///
  /// In en, this message translates to:
  /// **'Use a different email'**
  String get authOtpChangeEmail;

  /// No description provided for @authOtpCodeHelp.
  ///
  /// In en, this message translates to:
  /// **'We sent a 6-digit code to {email}. Enter it below to continue.'**
  String authOtpCodeHelp(Object email);

  /// No description provided for @authOtpResendIn.
  ///
  /// In en, this message translates to:
  /// **'You can resend a code in {seconds}s.'**
  String authOtpResendIn(Object seconds);

  /// No description provided for @landingNavBrand.
  ///
  /// In en, this message translates to:
  /// **'Zora-Walat'**
  String get landingNavBrand;

  /// No description provided for @landingHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Send airtime to Afghanistan in seconds'**
  String get landingHeroTitle;

  /// No description provided for @landingHeroSubtitle.
  ///
  /// In en, this message translates to:
  /// **'International mobile top-up for Afghan numbers — built for families abroad who need a fast, trustworthy way to stay connected.'**
  String get landingHeroSubtitle;

  /// No description provided for @landingTrustBadge.
  ///
  /// In en, this message translates to:
  /// **'USD pricing · Secure checkout · Built for the diaspora'**
  String get landingTrustBadge;

  /// No description provided for @landingCtaGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get started'**
  String get landingCtaGetStarted;

  /// No description provided for @landingCtaSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get landingCtaSignIn;

  /// No description provided for @landingLanguagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Languages'**
  String get landingLanguagesTitle;

  /// No description provided for @landingLanguagesBody.
  ///
  /// In en, this message translates to:
  /// **'Full experience in English, Dari, and Pashto — switch anytime from the toolbar.'**
  String get landingLanguagesBody;

  /// No description provided for @landingWhyTitle.
  ///
  /// In en, this message translates to:
  /// **'Why Zora-Walat'**
  String get landingWhyTitle;

  /// No description provided for @landingWhyFastTitle.
  ///
  /// In en, this message translates to:
  /// **'Fast top-up'**
  String get landingWhyFastTitle;

  /// No description provided for @landingWhyFastBody.
  ///
  /// In en, this message translates to:
  /// **'Complete your purchase quickly and move from amount to package without friction.'**
  String get landingWhyFastBody;

  /// No description provided for @landingWhySecureTitle.
  ///
  /// In en, this message translates to:
  /// **'Secure payments'**
  String get landingWhySecureTitle;

  /// No description provided for @landingWhySecureBody.
  ///
  /// In en, this message translates to:
  /// **'Checkout uses trusted card processing — your card details never touch our servers.'**
  String get landingWhySecureBody;

  /// No description provided for @landingWhyPricingTitle.
  ///
  /// In en, this message translates to:
  /// **'Transparent pricing'**
  String get landingWhyPricingTitle;

  /// No description provided for @landingWhyPricingBody.
  ///
  /// In en, this message translates to:
  /// **'See costs clearly in US dollars before you pay — no surprises at checkout.'**
  String get landingWhyPricingBody;

  /// No description provided for @landingWhyLangTitle.
  ///
  /// In en, this message translates to:
  /// **'Multi-language experience'**
  String get landingWhyLangTitle;

  /// No description provided for @landingWhyLangBody.
  ///
  /// In en, this message translates to:
  /// **'Use the app in English, Dari, or Pashto — whichever fits you and your family.'**
  String get landingWhyLangBody;

  /// No description provided for @landingHowTitle.
  ///
  /// In en, this message translates to:
  /// **'How it works'**
  String get landingHowTitle;

  /// No description provided for @landingHowStep1Title.
  ///
  /// In en, this message translates to:
  /// **'Enter the Afghan number'**
  String get landingHowStep1Title;

  /// No description provided for @landingHowStep1Body.
  ///
  /// In en, this message translates to:
  /// **'Choose the operator and amount in USD, or pick an airtime or data package.'**
  String get landingHowStep1Body;

  /// No description provided for @landingHowStep2Title.
  ///
  /// In en, this message translates to:
  /// **'Review and pay securely'**
  String get landingHowStep2Title;

  /// No description provided for @landingHowStep2Body.
  ///
  /// In en, this message translates to:
  /// **'Confirm details, then complete payment on Stripe’s hosted checkout — your card never touches our servers.'**
  String get landingHowStep2Body;

  /// No description provided for @landingHowStep3Title.
  ///
  /// In en, this message translates to:
  /// **'Top-up is delivered'**
  String get landingHowStep3Title;

  /// No description provided for @landingHowStep3Body.
  ///
  /// In en, this message translates to:
  /// **'We process your order and send credit to the recipient’s mobile line.'**
  String get landingHowStep3Body;

  /// No description provided for @landingFooterNote.
  ///
  /// In en, this message translates to:
  /// **'Zora-Walat · Afghanistan mobile top-up'**
  String get landingFooterNote;

  /// No description provided for @successScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'You’re all set'**
  String get successScreenTitle;

  /// No description provided for @successPaymentConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Payment received'**
  String get successPaymentConfirmed;

  /// No description provided for @successStripeConfirmedShort.
  ///
  /// In en, this message translates to:
  /// **'Your bank authorized this purchase. We’re completing your top-up now.'**
  String get successStripeConfirmedShort;

  /// No description provided for @successMissingReturnParamsHint.
  ///
  /// In en, this message translates to:
  /// **'This address is missing payment reference details (session or order id). If you completed checkout, open Recent orders or use the link from Stripe’s confirmation email.'**
  String get successMissingReturnParamsHint;

  /// No description provided for @successBootstrapWarning.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t refresh live order status yet. Your payment may still be processing — check Recent orders in a moment.\n{detail}'**
  String successBootstrapWarning(String detail);

  /// No description provided for @receiptTitle.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get receiptTitle;

  /// No description provided for @receiptOrderRef.
  ///
  /// In en, this message translates to:
  /// **'Order reference'**
  String get receiptOrderRef;

  /// No description provided for @receiptPaymentStatus.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get receiptPaymentStatus;

  /// No description provided for @receiptFulfillmentStatus.
  ///
  /// In en, this message translates to:
  /// **'Top-up status'**
  String get receiptFulfillmentStatus;

  /// No description provided for @receiptTrustTitle.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get receiptTrustTitle;

  /// No description provided for @receiptTrustPaidUsd.
  ///
  /// In en, this message translates to:
  /// **'Paid (USD)'**
  String get receiptTrustPaidUsd;

  /// No description provided for @receiptTrustDeliveredValue.
  ///
  /// In en, this message translates to:
  /// **'Delivered value (USD)'**
  String get receiptTrustDeliveredValue;

  /// No description provided for @receiptTrustStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get receiptTrustStatus;

  /// No description provided for @receiptTrustUpdatedAt.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get receiptTrustUpdatedAt;

  /// No description provided for @receiptTrustPaidAt.
  ///
  /// In en, this message translates to:
  /// **'Payment time'**
  String get receiptTrustPaidAt;

  /// No description provided for @receiptTrustFeeFinal.
  ///
  /// In en, this message translates to:
  /// **'Processing fee (final): {fee}'**
  String receiptTrustFeeFinal(String fee);

  /// No description provided for @receiptTrustFeeEstimated.
  ///
  /// In en, this message translates to:
  /// **'Processing fee (estimated): {fee}'**
  String receiptTrustFeeEstimated(String fee);

  /// No description provided for @receiptTrustFxNoteTitle.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get receiptTrustFxNoteTitle;

  /// No description provided for @receiptTrustDeliveryNoteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delivery timing'**
  String get receiptTrustDeliveryNoteTitle;

  /// No description provided for @orderTrustStatusProcessing.
  ///
  /// In en, this message translates to:
  /// **'Processing'**
  String get orderTrustStatusProcessing;

  /// No description provided for @orderTrustStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderTrustStatusDelivered;

  /// No description provided for @orderTrustStatusDelayed.
  ///
  /// In en, this message translates to:
  /// **'Delayed'**
  String get orderTrustStatusDelayed;

  /// No description provided for @orderTrustStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get orderTrustStatusFailed;

  /// No description provided for @orderTrustStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderTrustStatusCancelled;

  /// No description provided for @receiptWhatNextTitle.
  ///
  /// In en, this message translates to:
  /// **'What happens next'**
  String get receiptWhatNextTitle;

  /// No description provided for @receiptWhatNextBody.
  ///
  /// In en, this message translates to:
  /// **'We’ll send credit to the operator network you selected. Most top-ups finish within a few minutes. This screen stays available in your recent orders.'**
  String get receiptWhatNextBody;

  /// No description provided for @successViewOrders.
  ///
  /// In en, this message translates to:
  /// **'View recent orders'**
  String get successViewOrders;

  /// No description provided for @successBackHome.
  ///
  /// In en, this message translates to:
  /// **'Back to home'**
  String get successBackHome;

  /// No description provided for @trustSecurePayment.
  ///
  /// In en, this message translates to:
  /// **'Secure payment'**
  String get trustSecurePayment;

  /// No description provided for @trustEncrypted.
  ///
  /// In en, this message translates to:
  /// **'Encrypted checkout'**
  String get trustEncrypted;

  /// No description provided for @trustTransparentPricing.
  ///
  /// In en, this message translates to:
  /// **'Clear pricing'**
  String get trustTransparentPricing;

  /// No description provided for @trustLiveTracking.
  ///
  /// In en, this message translates to:
  /// **'Live tracking'**
  String get trustLiveTracking;

  /// No description provided for @timelineTitle.
  ///
  /// In en, this message translates to:
  /// **'Order progress'**
  String get timelineTitle;

  /// No description provided for @timelinePayment.
  ///
  /// In en, this message translates to:
  /// **'Payment received'**
  String get timelinePayment;

  /// No description provided for @timelinePreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing your top-up'**
  String get timelinePreparing;

  /// No description provided for @timelineSending.
  ///
  /// In en, this message translates to:
  /// **'Sending to operator'**
  String get timelineSending;

  /// No description provided for @timelineDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered to line'**
  String get timelineDelivered;

  /// No description provided for @trackingHeadlineDelivered.
  ///
  /// In en, this message translates to:
  /// **'Credit is on its way'**
  String get trackingHeadlineDelivered;

  /// No description provided for @trackingBodyDelivered.
  ///
  /// In en, this message translates to:
  /// **'Your payment is secure and the carrier is applying credit to the number you chose. You’ll see a confirmation reference when the network finishes.'**
  String get trackingBodyDelivered;

  /// No description provided for @trackingHeadlineNeedsHelp.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t finish this top-up'**
  String get trackingHeadlineNeedsHelp;

  /// No description provided for @trackingBodyFailedCalm.
  ///
  /// In en, this message translates to:
  /// **'Your payment went through safely — nothing was lost. Our team can review this order and help complete delivery. Save your order reference if you contact support.'**
  String get trackingBodyFailedCalm;

  /// No description provided for @trackingHeadlineRetrying.
  ///
  /// In en, this message translates to:
  /// **'Taking another path to deliver'**
  String get trackingHeadlineRetrying;

  /// No description provided for @trackingBodyRetrying.
  ///
  /// In en, this message translates to:
  /// **'Sometimes networks need a moment. We’re retrying delivery automatically so you don’t have to do anything yet.'**
  String get trackingBodyRetrying;

  /// No description provided for @trackingHeadlineSending.
  ///
  /// In en, this message translates to:
  /// **'Sending credit now'**
  String get trackingHeadlineSending;

  /// No description provided for @trackingBodySending.
  ///
  /// In en, this message translates to:
  /// **'Your package is moving to the mobile operator. This usually completes quickly.'**
  String get trackingBodySending;

  /// No description provided for @trackingHeadlinePreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing your top-up'**
  String get trackingHeadlinePreparing;

  /// No description provided for @trackingBodyPreparing.
  ///
  /// In en, this message translates to:
  /// **'Your payment is confirmed. We’re lining up delivery to the correct network and number.'**
  String get trackingBodyPreparing;

  /// No description provided for @trackingHeadlinePaymentConfirming.
  ///
  /// In en, this message translates to:
  /// **'Confirming your payment'**
  String get trackingHeadlinePaymentConfirming;

  /// No description provided for @trackingBodyPaymentConfirming.
  ///
  /// In en, this message translates to:
  /// **'Your bank is finishing authorization. Sit tight — delivery will begin right after confirmation.'**
  String get trackingBodyPaymentConfirming;

  /// No description provided for @trackingHeadlinePaymentReceived.
  ///
  /// In en, this message translates to:
  /// **'Payment secured'**
  String get trackingHeadlinePaymentReceived;

  /// No description provided for @trackingBodyPaymentReceived.
  ///
  /// In en, this message translates to:
  /// **'Stripe confirmed your payment. The next steps happen automatically on our side.'**
  String get trackingBodyPaymentReceived;

  /// No description provided for @trackingHeadlineCatchingUp.
  ///
  /// In en, this message translates to:
  /// **'Almost there'**
  String get trackingHeadlineCatchingUp;

  /// No description provided for @trackingBodyCatchingUp.
  ///
  /// In en, this message translates to:
  /// **'We’re syncing the latest status. Your payment is recorded — check back in a minute or open recent orders.'**
  String get trackingBodyCatchingUp;

  /// No description provided for @trackingHeadlineVerifying.
  ///
  /// In en, this message translates to:
  /// **'Confirming with the operator'**
  String get trackingHeadlineVerifying;

  /// No description provided for @trackingBodyVerifying.
  ///
  /// In en, this message translates to:
  /// **'Your payment is secure. We’re verifying the final step with the mobile operator and only show “delivered” when we have proof it completed. This can take a little longer than usual.'**
  String get trackingBodyVerifying;

  /// No description provided for @trackingHeadlineSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see live status'**
  String get trackingHeadlineSignIn;

  /// No description provided for @trackingBodySignIn.
  ///
  /// In en, this message translates to:
  /// **'Your payment is on file. Sign in to refresh delivery details whenever you like.'**
  String get trackingBodySignIn;

  /// No description provided for @paymentSafeBanner.
  ///
  /// In en, this message translates to:
  /// **'Your payment is protected. Charges are processed by Stripe — we never store your card.'**
  String get paymentSafeBanner;

  /// No description provided for @cancelScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Checkout paused'**
  String get cancelScreenTitle;

  /// No description provided for @cancelScreenLead.
  ///
  /// In en, this message translates to:
  /// **'No worries — you can try again anytime.'**
  String get cancelScreenLead;

  /// No description provided for @cancelScreenBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing was charged. When you’re ready, return to your order and continue with secure checkout.'**
  String get cancelScreenBody;

  /// No description provided for @cancelBackHome.
  ///
  /// In en, this message translates to:
  /// **'Back to home'**
  String get cancelBackHome;

  /// No description provided for @ordersScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Recent orders'**
  String get ordersScreenTitle;

  /// No description provided for @ordersEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get ordersEmptyTitle;

  /// No description provided for @ordersEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'After you complete a top-up, a receipt appears here on this device so you can track delivery.'**
  String get ordersEmptyBody;

  /// No description provided for @ordersEmptyBodySignedIn.
  ///
  /// In en, this message translates to:
  /// **'When you complete a top-up while signed in, your receipts stay with your account and sync here. You can still see device-only drafts from before sign-in.'**
  String get ordersEmptyBodySignedIn;

  /// No description provided for @ordersSourceAccount.
  ///
  /// In en, this message translates to:
  /// **'Synced'**
  String get ordersSourceAccount;

  /// No description provided for @ordersSourceDevice.
  ///
  /// In en, this message translates to:
  /// **'This device'**
  String get ordersSourceDevice;

  /// No description provided for @ordersCloudRefreshFailed.
  ///
  /// In en, this message translates to:
  /// **'We couldn’t reach your account orders. Showing what’s saved on this device.'**
  String get ordersCloudRefreshFailed;

  /// No description provided for @ordersDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Order details'**
  String get ordersDetailTitle;

  /// No description provided for @ordersSectionLive.
  ///
  /// In en, this message translates to:
  /// **'Current status'**
  String get ordersSectionLive;

  /// No description provided for @ordersSectionRecord.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get ordersSectionRecord;

  /// No description provided for @ordersCopyReference.
  ///
  /// In en, this message translates to:
  /// **'Copy reference'**
  String get ordersCopyReference;

  /// No description provided for @ordersReferenceCopied.
  ///
  /// In en, this message translates to:
  /// **'Reference copied'**
  String get ordersReferenceCopied;

  /// No description provided for @trackingHeadlineCancelled.
  ///
  /// In en, this message translates to:
  /// **'This order was cancelled'**
  String get trackingHeadlineCancelled;

  /// No description provided for @trackingBodyCancelled.
  ///
  /// In en, this message translates to:
  /// **'No charge was completed for this order. You can start a new top-up anytime.'**
  String get trackingBodyCancelled;

  /// No description provided for @ordersLastUpdated.
  ///
  /// In en, this message translates to:
  /// **'Updated {time}'**
  String ordersLastUpdated(String time);

  /// No description provided for @orderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderStatusDelivered;

  /// No description provided for @orderStatusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get orderStatusInProgress;

  /// No description provided for @orderStatusRetrying.
  ///
  /// In en, this message translates to:
  /// **'Retrying'**
  String get orderStatusRetrying;

  /// No description provided for @orderStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Needs attention'**
  String get orderStatusFailed;

  /// No description provided for @orderStatusPaymentPending.
  ///
  /// In en, this message translates to:
  /// **'Confirming payment'**
  String get orderStatusPaymentPending;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderStatusCancelled;

  /// No description provided for @orderStatusSending.
  ///
  /// In en, this message translates to:
  /// **'Sending'**
  String get orderStatusSending;

  /// No description provided for @orderStatusVerifying.
  ///
  /// In en, this message translates to:
  /// **'Confirming delivery'**
  String get orderStatusVerifying;

  /// No description provided for @orderStatusPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get orderStatusPreparing;

  /// No description provided for @hubTileOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'Recent orders'**
  String get hubTileOrdersTitle;

  /// No description provided for @hubTileOrdersSub.
  ///
  /// In en, this message translates to:
  /// **'Receipts · synced when signed in'**
  String get hubTileOrdersSub;

  /// No description provided for @receiptPaymentPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get receiptPaymentPaid;

  /// No description provided for @receiptPaymentPending.
  ///
  /// In en, this message translates to:
  /// **'Confirming'**
  String get receiptPaymentPending;

  /// No description provided for @receiptFulfillmentDone.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get receiptFulfillmentDone;

  /// No description provided for @receiptFulfillmentProgress.
  ///
  /// In en, this message translates to:
  /// **'Processing'**
  String get receiptFulfillmentProgress;

  /// No description provided for @receiptCarrierRef.
  ///
  /// In en, this message translates to:
  /// **'Carrier reference'**
  String get receiptCarrierRef;

  /// No description provided for @rechargeFailureCalmTitle.
  ///
  /// In en, this message translates to:
  /// **'Checkout didn’t complete'**
  String get rechargeFailureCalmTitle;

  /// No description provided for @rechargeFailureCalmBody.
  ///
  /// In en, this message translates to:
  /// **'Nothing was charged. Check your connection and try again — your details are still here.'**
  String get rechargeFailureCalmBody;

  /// No description provided for @checkoutTrustCallout.
  ///
  /// In en, this message translates to:
  /// **'You’ll complete payment on a secure Stripe page. Your card never passes through our servers.'**
  String get checkoutTrustCallout;

  /// No description provided for @loyaltyHubTitle.
  ///
  /// In en, this message translates to:
  /// **'Family recognition'**
  String get loyaltyHubTitle;

  /// No description provided for @loyaltyHubSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Earn points from completed top-ups. No games or drawings — just transparent activity you control.'**
  String get loyaltyHubSubtitle;

  /// No description provided for @loyaltyLifetimePoints.
  ///
  /// In en, this message translates to:
  /// **'Lifetime points'**
  String get loyaltyLifetimePoints;

  /// No description provided for @loyaltyMonthPoints.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get loyaltyMonthPoints;

  /// No description provided for @loyaltyMonthRank.
  ///
  /// In en, this message translates to:
  /// **'Monthly placement'**
  String get loyaltyMonthRank;

  /// No description provided for @loyaltyGroupPoints.
  ///
  /// In en, this message translates to:
  /// **'Family group points'**
  String get loyaltyGroupPoints;

  /// No description provided for @loyaltyGroupRank.
  ///
  /// In en, this message translates to:
  /// **'Group placement'**
  String get loyaltyGroupRank;

  /// No description provided for @loyaltyLeaderboardTab.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get loyaltyLeaderboardTab;

  /// No description provided for @loyaltyYouTab.
  ///
  /// In en, this message translates to:
  /// **'You & family'**
  String get loyaltyYouTab;

  /// No description provided for @loyaltyTopGroups.
  ///
  /// In en, this message translates to:
  /// **'Top groups'**
  String get loyaltyTopGroups;

  /// No description provided for @loyaltyTopMembers.
  ///
  /// In en, this message translates to:
  /// **'Top participants'**
  String get loyaltyTopMembers;

  /// No description provided for @loyaltyRecognitionBand.
  ///
  /// In en, this message translates to:
  /// **'Recognition band'**
  String get loyaltyRecognitionBand;

  /// No description provided for @loyaltyProgressClimb.
  ///
  /// In en, this message translates to:
  /// **'Move up the leaderboard with qualifying orders — never random chance.'**
  String get loyaltyProgressClimb;

  /// No description provided for @loyaltyLegalFootnote.
  ///
  /// In en, this message translates to:
  /// **'Points are based on successful orders only. There is no lottery, sweepstakes, or prize game.'**
  String get loyaltyLegalFootnote;

  /// No description provided for @loyaltyCreateGroup.
  ///
  /// In en, this message translates to:
  /// **'Create family group'**
  String get loyaltyCreateGroup;

  /// No description provided for @loyaltyJoinGroup.
  ///
  /// In en, this message translates to:
  /// **'Join with invite code'**
  String get loyaltyJoinGroup;

  /// No description provided for @loyaltyInviteHint.
  ///
  /// In en, this message translates to:
  /// **'Owners can share the invite code from this screen. Keep it in trusted chats only.'**
  String get loyaltyInviteHint;

  /// No description provided for @loyaltyDissolveGroup.
  ///
  /// In en, this message translates to:
  /// **'End group'**
  String get loyaltyDissolveGroup;

  /// No description provided for @loyaltyLeaveGroup.
  ///
  /// In en, this message translates to:
  /// **'Leave group'**
  String get loyaltyLeaveGroup;

  /// No description provided for @loyaltyRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get loyaltyRefresh;

  /// No description provided for @hubTileLoyaltyTitle.
  ///
  /// In en, this message translates to:
  /// **'Family recognition'**
  String get hubTileLoyaltyTitle;

  /// No description provided for @hubTileLoyaltySub.
  ///
  /// In en, this message translates to:
  /// **'Points · leaderboard · invites'**
  String get hubTileLoyaltySub;

  /// No description provided for @loyaltyDaysLeft.
  ///
  /// In en, this message translates to:
  /// **'{days} days left this month'**
  String loyaltyDaysLeft(int days);

  /// No description provided for @loyaltyPointsToRankAhead.
  ///
  /// In en, this message translates to:
  /// **'{points} pts to tie #{rank}'**
  String loyaltyPointsToRankAhead(int points, int rank);

  /// No description provided for @loyaltyRanksToTier.
  ///
  /// In en, this message translates to:
  /// **'{ranks} ranks to reach {tier}'**
  String loyaltyRanksToTier(int ranks, String tier);

  /// No description provided for @loyaltyYouPlacement.
  ///
  /// In en, this message translates to:
  /// **'{label} this month'**
  String loyaltyYouPlacement(String label);

  /// No description provided for @loyaltyTightBehind.
  ///
  /// In en, this message translates to:
  /// **'The field behind you is close — steady orders help hold your place.'**
  String get loyaltyTightBehind;

  /// No description provided for @loyaltyChasingPack.
  ///
  /// In en, this message translates to:
  /// **'#{rank} trails by {pts} pts'**
  String loyaltyChasingPack(int rank, int pts);

  /// No description provided for @loyaltyProgressYourMonthTitle.
  ///
  /// In en, this message translates to:
  /// **'Your monthly momentum'**
  String get loyaltyProgressYourMonthTitle;

  /// No description provided for @loyaltyProgressGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'Family monthly momentum'**
  String get loyaltyProgressGroupTitle;

  /// No description provided for @loyaltyProgressTierTitle.
  ///
  /// In en, this message translates to:
  /// **'Tier runway'**
  String get loyaltyProgressTierTitle;

  /// No description provided for @loyaltyProgressRankTitle.
  ///
  /// In en, this message translates to:
  /// **'Closing on the rank ahead'**
  String get loyaltyProgressRankTitle;

  /// No description provided for @loyaltyGroupBoardGap.
  ///
  /// In en, this message translates to:
  /// **'{pts} pts to move up vs top groups'**
  String loyaltyGroupBoardGap(int pts);

  /// No description provided for @loyaltyYourShareOfFamily.
  ///
  /// In en, this message translates to:
  /// **'Your share of this month\'s family points: {pct}%'**
  String loyaltyYourShareOfFamily(int pct);

  /// No description provided for @loyaltySoloFamilyMonth.
  ///
  /// In en, this message translates to:
  /// **'You\'re setting the pace for your family\'s month.'**
  String get loyaltySoloFamilyMonth;

  /// No description provided for @loyaltyCarryingMost.
  ///
  /// In en, this message translates to:
  /// **'You\'re carrying most of this month\'s family activity.'**
  String get loyaltyCarryingMost;

  /// No description provided for @loyaltyAchievementsHeading.
  ///
  /// In en, this message translates to:
  /// **'Milestones'**
  String get loyaltyAchievementsHeading;

  /// No description provided for @loyaltyAchFirstOrderTitle.
  ///
  /// In en, this message translates to:
  /// **'First qualifying order'**
  String get loyaltyAchFirstOrderTitle;

  /// No description provided for @loyaltyAchFirstOrderSub.
  ///
  /// In en, this message translates to:
  /// **'Recognition starts with one completed top-up.'**
  String get loyaltyAchFirstOrderSub;

  /// No description provided for @loyaltyAchCenturyTitle.
  ///
  /// In en, this message translates to:
  /// **'100 lifetime points'**
  String get loyaltyAchCenturyTitle;

  /// No description provided for @loyaltyAchCenturySub.
  ///
  /// In en, this message translates to:
  /// **'Consistency adds up — thank you for staying with us.'**
  String get loyaltyAchCenturySub;

  /// No description provided for @loyaltyAchGroupTitle.
  ///
  /// In en, this message translates to:
  /// **'Family orbit'**
  String get loyaltyAchGroupTitle;

  /// No description provided for @loyaltyAchGroupSub.
  ///
  /// In en, this message translates to:
  /// **'Your family group crossed a visibility milestone together.'**
  String get loyaltyAchGroupSub;

  /// No description provided for @loyaltyRankBadge.
  ///
  /// In en, this message translates to:
  /// **'Rank'**
  String get loyaltyRankBadge;

  /// No description provided for @notifOrderPaymentTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment secured'**
  String get notifOrderPaymentTitle;

  /// No description provided for @notifOrderPaymentBody.
  ///
  /// In en, this message translates to:
  /// **'Your top-up is confirmed. We’re preparing delivery now.'**
  String get notifOrderPaymentBody;

  /// No description provided for @notifOrderPreparingTitle.
  ///
  /// In en, this message translates to:
  /// **'Preparing your top-up'**
  String get notifOrderPreparingTitle;

  /// No description provided for @notifOrderPreparingBody.
  ///
  /// In en, this message translates to:
  /// **'We’re aligning delivery with the network you selected.'**
  String get notifOrderPreparingBody;

  /// No description provided for @notifOrderSendingTitle.
  ///
  /// In en, this message translates to:
  /// **'Sending to the operator'**
  String get notifOrderSendingTitle;

  /// No description provided for @notifOrderSendingBody.
  ///
  /// In en, this message translates to:
  /// **'Credit is on the way — most finish within a few minutes.'**
  String get notifOrderSendingBody;

  /// No description provided for @notifOrderDeliveredTitle.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get notifOrderDeliveredTitle;

  /// No description provided for @notifOrderDeliveredBody.
  ///
  /// In en, this message translates to:
  /// **'Your line should show the top-up. Tap to view your receipt.'**
  String get notifOrderDeliveredBody;

  /// No description provided for @notifOrderRetryingTitle.
  ///
  /// In en, this message translates to:
  /// **'Taking another moment'**
  String get notifOrderRetryingTitle;

  /// No description provided for @notifOrderRetryingBody.
  ///
  /// In en, this message translates to:
  /// **'The network asked for a retry — we’re handling it for you.'**
  String get notifOrderRetryingBody;

  /// No description provided for @notifOrderFailedTitle.
  ///
  /// In en, this message translates to:
  /// **'We’re here to help'**
  String get notifOrderFailedTitle;

  /// No description provided for @notifOrderFailedBody.
  ///
  /// In en, this message translates to:
  /// **'Your payment stayed protected. Open the order for calm next steps.'**
  String get notifOrderFailedBody;

  /// No description provided for @notifInboxTitle.
  ///
  /// In en, this message translates to:
  /// **'Updates'**
  String get notifInboxTitle;

  /// No description provided for @notifInboxEmpty.
  ///
  /// In en, this message translates to:
  /// **'You’re all caught up. We’ll let you know when something changes.'**
  String get notifInboxEmpty;

  /// No description provided for @notifHubTooltip.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifHubTooltip;

  /// No description provided for @notifLoyaltyRankUpTitle.
  ///
  /// In en, this message translates to:
  /// **'You moved up'**
  String get notifLoyaltyRankUpTitle;

  /// No description provided for @notifLoyaltyRankUpBody.
  ///
  /// In en, this message translates to:
  /// **'Your monthly standing improved — see Family recognition.'**
  String get notifLoyaltyRankUpBody;

  /// No description provided for @notifLoyaltyRankDownTitle.
  ///
  /// In en, this message translates to:
  /// **'Rankings shifted'**
  String get notifLoyaltyRankDownTitle;

  /// No description provided for @notifLoyaltyRankDownBody.
  ///
  /// In en, this message translates to:
  /// **'Others moved ahead this month — steady activity keeps you in the race.'**
  String get notifLoyaltyRankDownBody;

  /// No description provided for @notifLoyaltyMilestoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Points milestone'**
  String get notifLoyaltyMilestoneTitle;

  /// No description provided for @notifLoyaltyMilestoneBody.
  ///
  /// In en, this message translates to:
  /// **'You crossed a recognition milestone — open Family recognition.'**
  String get notifLoyaltyMilestoneBody;

  /// No description provided for @notifLoyaltyMonthUrgencyTitle.
  ///
  /// In en, this message translates to:
  /// **'Month closing soon'**
  String get notifLoyaltyMonthUrgencyTitle;

  /// No description provided for @notifLoyaltyMonthUrgencyBody.
  ///
  /// In en, this message translates to:
  /// **'Just a few days left to firm up this month’s placement.'**
  String get notifLoyaltyMonthUrgencyBody;

  /// No description provided for @notifMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notifMarkAllRead;

  /// No description provided for @helpCenterTitle.
  ///
  /// In en, this message translates to:
  /// **'Help center'**
  String get helpCenterTitle;

  /// No description provided for @helpCenterSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Straight answers about payments, delivery, and your orders — in plain language.'**
  String get helpCenterSubtitle;

  /// No description provided for @helpSectionPaymentTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment safety'**
  String get helpSectionPaymentTitle;

  /// No description provided for @helpSectionPaymentBody.
  ///
  /// In en, this message translates to:
  /// **'Checkout runs on Stripe’s secure page. Zora-Walat never sees or stores your full card number. If a charge appears, your bank authorized it — we only complete the top-up you confirmed.'**
  String get helpSectionPaymentBody;

  /// No description provided for @helpSectionDeliveryTitle.
  ///
  /// In en, this message translates to:
  /// **'Delivery timing'**
  String get helpSectionDeliveryTitle;

  /// No description provided for @helpSectionDeliveryBody.
  ///
  /// In en, this message translates to:
  /// **'Most Afghan mobile top-ups finish within a few minutes. Operator networks occasionally need extra time. Pull to refresh on your order — status updates as soon as our partners report back.'**
  String get helpSectionDeliveryBody;

  /// No description provided for @helpSectionRetryTitle.
  ///
  /// In en, this message translates to:
  /// **'Retries and short delays'**
  String get helpSectionRetryTitle;

  /// No description provided for @helpSectionRetryBody.
  ///
  /// In en, this message translates to:
  /// **'When a network asks for another attempt, our systems retry automatically. You don’t need to pay again. If an order stays unusual longer than expected, your payment record stays safe while we work with the operator.'**
  String get helpSectionRetryBody;

  /// No description provided for @helpSectionTrackingTitle.
  ///
  /// In en, this message translates to:
  /// **'Order tracking'**
  String get helpSectionTrackingTitle;

  /// No description provided for @helpSectionTrackingBody.
  ///
  /// In en, this message translates to:
  /// **'Recent orders show the same stages you’d expect from a carrier: payment confirmed, preparation, handoff to the operator, then delivered. Anything that needs your attention is labeled clearly — never hidden in technical jargon.'**
  String get helpSectionTrackingBody;

  /// No description provided for @helpSectionLoyaltyTitle.
  ///
  /// In en, this message translates to:
  /// **'Rewards and family points'**
  String get helpSectionLoyaltyTitle;

  /// No description provided for @helpSectionLoyaltyBody.
  ///
  /// In en, this message translates to:
  /// **'Successful top-ups earn recognition points for you and optional family groups. There’s no random drawing — placement reflects real activity you can see on the leaderboard.'**
  String get helpSectionLoyaltyBody;

  /// No description provided for @helpSectionContactTitle.
  ///
  /// In en, this message translates to:
  /// **'Contact and next steps'**
  String get helpSectionContactTitle;

  /// No description provided for @helpSectionContactBody.
  ///
  /// In en, this message translates to:
  /// **'Open any order and tap “Copy for support” to grab a professional summary (order reference, network, masked number, statuses, and time). Share that with whoever assists you — it’s the fastest way to get precise help without exposing private details.'**
  String get helpSectionContactBody;

  /// No description provided for @helpOpenLoyalty.
  ///
  /// In en, this message translates to:
  /// **'Open family recognition'**
  String get helpOpenLoyalty;

  /// No description provided for @supportNeedHelp.
  ///
  /// In en, this message translates to:
  /// **'Need help?'**
  String get supportNeedHelp;

  /// No description provided for @supportOpenHelpCenter.
  ///
  /// In en, this message translates to:
  /// **'Help center'**
  String get supportOpenHelpCenter;

  /// No description provided for @supportCopyPacket.
  ///
  /// In en, this message translates to:
  /// **'Copy for support'**
  String get supportCopyPacket;

  /// No description provided for @supportPacketCopied.
  ///
  /// In en, this message translates to:
  /// **'Support summary copied'**
  String get supportPacketCopied;

  /// No description provided for @supportPacketHeader.
  ///
  /// In en, this message translates to:
  /// **'Zora-Walat — support summary'**
  String get supportPacketHeader;

  /// No description provided for @supportPacketOrderRef.
  ///
  /// In en, this message translates to:
  /// **'Order reference'**
  String get supportPacketOrderRef;

  /// No description provided for @supportPacketRoute.
  ///
  /// In en, this message translates to:
  /// **'Route'**
  String get supportPacketRoute;

  /// No description provided for @supportPacketRouteValue.
  ///
  /// In en, this message translates to:
  /// **'Mobile top-up (airtime / data)'**
  String get supportPacketRouteValue;

  /// No description provided for @supportPacketRecipient.
  ///
  /// In en, this message translates to:
  /// **'Recipient (masked)'**
  String get supportPacketRecipient;

  /// No description provided for @supportPacketUpdated.
  ///
  /// In en, this message translates to:
  /// **'Last updated'**
  String get supportPacketUpdated;

  /// No description provided for @supportAssistRetryingTitle.
  ///
  /// In en, this message translates to:
  /// **'We’re retrying automatically'**
  String get supportAssistRetryingTitle;

  /// No description provided for @supportAssistRetryingBody.
  ///
  /// In en, this message translates to:
  /// **'The operator network requested another delivery attempt. That’s common — our systems handle retries so you don’t have to start over or pay twice.'**
  String get supportAssistRetryingBody;

  /// No description provided for @supportAssistRetryingNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: wait a few minutes, then pull down to refresh. You’ll see each update here.'**
  String get supportAssistRetryingNext;

  /// No description provided for @supportAssistDelayedTitle.
  ///
  /// In en, this message translates to:
  /// **'Still catching up'**
  String get supportAssistDelayedTitle;

  /// No description provided for @supportAssistDelayedBody.
  ///
  /// In en, this message translates to:
  /// **'This order is taking a bit longer than usual to sync or deliver. Your payment is already logged — nothing disappears when timing stretches.'**
  String get supportAssistDelayedBody;

  /// No description provided for @supportAssistDelayedNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: refresh this screen, check recent orders, and sign in if prompted so live status can sync.'**
  String get supportAssistDelayedNext;

  /// No description provided for @supportAssistFailedTitle.
  ///
  /// In en, this message translates to:
  /// **'We’re reviewing with care'**
  String get supportAssistFailedTitle;

  /// No description provided for @supportAssistFailedBody.
  ///
  /// In en, this message translates to:
  /// **'Delivery didn’t finish on the first path, but your payment stayed protected. Our team and partners can reconcile using your order reference — no need to panic or repeat payment.'**
  String get supportAssistFailedBody;

  /// No description provided for @supportAssistFailedNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: copy the support summary from this screen and share it when you reach out. Keep the app handy for updates.'**
  String get supportAssistFailedNext;

  /// No description provided for @supportAssistPaymentConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment still confirming'**
  String get supportAssistPaymentConfirmTitle;

  /// No description provided for @supportAssistPaymentConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Your bank or card network is finishing authorization. That can take a short moment. We don’t start delivery until payment is fully confirmed — your line isn’t charged twice.'**
  String get supportAssistPaymentConfirmBody;

  /// No description provided for @supportAssistPaymentConfirmNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: stay on this screen briefly; if it lingers, refresh or check your recent orders after a minute.'**
  String get supportAssistPaymentConfirmNext;

  /// No description provided for @supportAssistOperatorTitle.
  ///
  /// In en, this message translates to:
  /// **'Waiting on operator confirmation'**
  String get supportAssistOperatorTitle;

  /// No description provided for @supportAssistOperatorBody.
  ///
  /// In en, this message translates to:
  /// **'Credit has left our side and is with the mobile operator. Most confirmations arrive quickly; some networks batch their acknowledgements.'**
  String get supportAssistOperatorBody;

  /// No description provided for @supportAssistOperatorNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: give it a few minutes, refresh, then check the recipient’s balance on the network if needed.'**
  String get supportAssistOperatorNext;

  /// No description provided for @supportAssistVerifyingTitle.
  ///
  /// In en, this message translates to:
  /// **'Still confirming safely'**
  String get supportAssistVerifyingTitle;

  /// No description provided for @supportAssistVerifyingBody.
  ///
  /// In en, this message translates to:
  /// **'Your payment is protected. The operator has not yet given us final confirmation, so we keep this order in a careful review state instead of guessing. Nothing is lost while we verify.'**
  String get supportAssistVerifyingBody;

  /// No description provided for @supportAssistVerifyingNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: wait a few minutes, refresh recent orders, and contact support with your order reference if it stays here for an unusually long time.'**
  String get supportAssistVerifyingNext;

  /// No description provided for @supportAssistCancelledTitle.
  ///
  /// In en, this message translates to:
  /// **'Order cancelled'**
  String get supportAssistCancelledTitle;

  /// No description provided for @supportAssistCancelledBody.
  ///
  /// In en, this message translates to:
  /// **'This session stopped before a successful charge. You can start a fresh top-up whenever you like — nothing here is stuck in limbo.'**
  String get supportAssistCancelledBody;

  /// No description provided for @supportAssistCancelledNext.
  ///
  /// In en, this message translates to:
  /// **'Best next step: return to recharge, double-check the number, and complete checkout again if you still need airtime.'**
  String get supportAssistCancelledNext;

  /// No description provided for @supportReassuranceFooter.
  ///
  /// In en, this message translates to:
  /// **'Payment safety and careful review stay on our side — you’ll always see honest status here.'**
  String get supportReassuranceFooter;

  /// No description provided for @supportOrderListHelpTooltip.
  ///
  /// In en, this message translates to:
  /// **'Help'**
  String get supportOrderListHelpTooltip;

  /// No description provided for @hubTileHelpTitle.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get hubTileHelpTitle;

  /// No description provided for @hubTileHelpSub.
  ///
  /// In en, this message translates to:
  /// **'Guides · payment safety · copy order details'**
  String get hubTileHelpSub;

  /// No description provided for @ordersDetailLoadingHint.
  ///
  /// In en, this message translates to:
  /// **'Loading your receipt…'**
  String get ordersDetailLoadingHint;

  /// No description provided for @ordersEmptySupportLine.
  ///
  /// In en, this message translates to:
  /// **'Questions? Open Help & support from home for calm guidance.'**
  String get ordersEmptySupportLine;

  /// No description provided for @referralCenterTitle.
  ///
  /// In en, this message translates to:
  /// **'Invite & earn'**
  String get referralCenterTitle;

  /// No description provided for @referralCenterSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Share Zora-Walat with people you trust. Clear rewards, honest rules — built for families topping up from abroad.'**
  String get referralCenterSubtitle;

  /// No description provided for @referralTrustLine.
  ///
  /// In en, this message translates to:
  /// **'Rewards are verified automatically when your friend’s first top-up completes successfully. No gimmicks — just a thank-you for growing the community.'**
  String get referralTrustLine;

  /// No description provided for @referralProgramPaused.
  ///
  /// In en, this message translates to:
  /// **'Invites are paused for now. Please check back later — we’ll announce when sharing is open again.'**
  String get referralProgramPaused;

  /// No description provided for @referralYourCode.
  ///
  /// In en, this message translates to:
  /// **'Your invite code'**
  String get referralYourCode;

  /// No description provided for @referralCopyCode.
  ///
  /// In en, this message translates to:
  /// **'Copy code'**
  String get referralCopyCode;

  /// No description provided for @referralCodeCopied.
  ///
  /// In en, this message translates to:
  /// **'Code copied'**
  String get referralCodeCopied;

  /// No description provided for @referralCopyInviteMessage.
  ///
  /// In en, this message translates to:
  /// **'Copy invite message'**
  String get referralCopyInviteMessage;

  /// No description provided for @referralInviteMessageCopied.
  ///
  /// In en, this message translates to:
  /// **'Invite message copied'**
  String get referralInviteMessageCopied;

  /// No description provided for @referralInviteMessageTemplate.
  ///
  /// In en, this message translates to:
  /// **'I use Zora-Walat for trusted Afghanistan mobile top-ups. Join with my code: {code}'**
  String referralInviteMessageTemplate(String code);

  /// No description provided for @referralHowItWorksTitle.
  ///
  /// In en, this message translates to:
  /// **'How rewards work'**
  String get referralHowItWorksTitle;

  /// No description provided for @referralHowItWorksBody.
  ///
  /// In en, this message translates to:
  /// **'When a friend creates an account with your code and their first top-up is successfully delivered — for at least {minUsd} — you earn {rewardUsd} in wallet credit for future purchases. One reward per friend.'**
  String referralHowItWorksBody(String rewardUsd, String minUsd);

  /// No description provided for @referralRewardRulesFootnote.
  ///
  /// In en, this message translates to:
  /// **'Wallet credits from invites are for top-ups only and can’t be withdrawn as cash. That protects everyone and keeps pricing fair.'**
  String get referralRewardRulesFootnote;

  /// No description provided for @referralWeeklyFairTitle.
  ///
  /// In en, this message translates to:
  /// **'Fair sharing each week'**
  String get referralWeeklyFairTitle;

  /// No description provided for @referralWeeklyFairBody.
  ///
  /// In en, this message translates to:
  /// **'Invite rewards come from a shared weekly pool so many families can participate. If a week is especially busy, some invites may finish qualifying even when the pool needs a fresh start — your friends still get the service they paid for.'**
  String get referralWeeklyFairBody;

  /// No description provided for @referralStatsInvited.
  ///
  /// In en, this message translates to:
  /// **'Invited'**
  String get referralStatsInvited;

  /// No description provided for @referralStatsSuccessful.
  ///
  /// In en, this message translates to:
  /// **'Successful'**
  String get referralStatsSuccessful;

  /// No description provided for @referralStatsEarned.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get referralStatsEarned;

  /// No description provided for @referralHistoryTitle.
  ///
  /// In en, this message translates to:
  /// **'Your invites'**
  String get referralHistoryTitle;

  /// No description provided for @referralHistoryEmpty.
  ///
  /// In en, this message translates to:
  /// **'When you share your code, each friend will appear here with a calm, simple status.'**
  String get referralHistoryEmpty;

  /// No description provided for @referralStatusPending.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get referralStatusPending;

  /// No description provided for @referralStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Qualified'**
  String get referralStatusCompleted;

  /// No description provided for @referralStatusRewarded.
  ///
  /// In en, this message translates to:
  /// **'Rewarded'**
  String get referralStatusRewarded;

  /// No description provided for @referralStatusRejected.
  ///
  /// In en, this message translates to:
  /// **'Not rewarded'**
  String get referralStatusRejected;

  /// No description provided for @referralPendingHint.
  ///
  /// In en, this message translates to:
  /// **'We’re waiting for your friend’s first successful top-up to finish.'**
  String get referralPendingHint;

  /// No description provided for @referralCompletedHint.
  ///
  /// In en, this message translates to:
  /// **'Qualified — your reward is being finalized.'**
  String get referralCompletedHint;

  /// No description provided for @referralRewardedHint.
  ///
  /// In en, this message translates to:
  /// **'Thank you — credit is in your wallet for future top-ups.'**
  String get referralRewardedHint;

  /// No description provided for @referralRejectedDetailBudget.
  ///
  /// In en, this message translates to:
  /// **'This week’s invite rewards were already fully allocated. Your friend’s service still went through — thank you for sharing Zora-Walat.'**
  String get referralRejectedDetailBudget;

  /// No description provided for @referralRejectedDetailWeeklyCap.
  ///
  /// In en, this message translates to:
  /// **'You’ve reached this week’s invite reward limit. You can invite again next week.'**
  String get referralRejectedDetailWeeklyCap;

  /// No description provided for @referralRejectedDetailLifetimeCap.
  ///
  /// In en, this message translates to:
  /// **'You’ve reached the long-term invite reward limit for your account. We appreciate how much you’ve shared Zora-Walat.'**
  String get referralRejectedDetailLifetimeCap;

  /// No description provided for @referralRejectedDetailNotEligible.
  ///
  /// In en, this message translates to:
  /// **'This invite didn’t meet the reward guidelines. Your friend can still use Zora-Walat normally.'**
  String get referralRejectedDetailNotEligible;

  /// No description provided for @referralRejectedDetailGeneric.
  ///
  /// In en, this message translates to:
  /// **'This invite didn’t receive a reward. If you have questions, use Help & support with your account signed in.'**
  String get referralRejectedDetailGeneric;

  /// No description provided for @referralRewardAmountLine.
  ///
  /// In en, this message translates to:
  /// **'Reward: {amount}'**
  String referralRewardAmountLine(String amount);

  /// No description provided for @hubTileReferralTitle.
  ///
  /// In en, this message translates to:
  /// **'Invite & earn'**
  String get hubTileReferralTitle;

  /// No description provided for @hubTileReferralSub.
  ///
  /// In en, this message translates to:
  /// **'Share your code · wallet rewards'**
  String get hubTileReferralSub;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'fa', 'ps'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'fa':
      return AppLocalizationsFa();
    case 'ps':
      return AppLocalizationsPs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
