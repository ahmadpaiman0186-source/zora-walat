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
  /// **'Send airtime or data to Afghanistan numbers in USD. Fast, transparent, and built for trust when you top up from the US, Canada, UK, or Europe.'**
  String get rechargeHero;

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
  /// **'Developers: set the Stripe publishable key in lib/stripe_keys.dart; pass PAYMENTS_API_BASE_URL at build time if your API is not localhost.'**
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
