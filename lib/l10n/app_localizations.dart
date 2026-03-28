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
  /// **'Developers: pass STRIPE_PUBLISHABLE_KEY and PAYMENTS_API_BASE_URL at build time.'**
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

  /// No description provided for @paymentSuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'Payment successful'**
  String get paymentSuccessTitle;

  /// No description provided for @paymentSuccessBody.
  ///
  /// In en, this message translates to:
  /// **'Thank you. Your payment is confirmed; carrier delivery completes on our side shortly.'**
  String get paymentSuccessBody;

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
