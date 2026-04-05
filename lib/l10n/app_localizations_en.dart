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

  @override
  String get successScreenTitle => 'You’re all set';

  @override
  String get successPaymentConfirmed => 'Payment received';

  @override
  String get successStripeConfirmedShort =>
      'Your bank authorized this purchase. We’re completing your top-up now.';

  @override
  String get receiptTitle => 'Receipt';

  @override
  String get receiptOrderRef => 'Order reference';

  @override
  String get receiptPaymentStatus => 'Payment';

  @override
  String get receiptFulfillmentStatus => 'Top-up status';

  @override
  String get receiptWhatNextTitle => 'What happens next';

  @override
  String get receiptWhatNextBody =>
      'We’ll send credit to the operator network you selected. Most top-ups finish within a few minutes. This screen stays available in your recent orders.';

  @override
  String get successViewOrders => 'View recent orders';

  @override
  String get successBackHome => 'Back to home';

  @override
  String get trustSecurePayment => 'Secure payment';

  @override
  String get trustEncrypted => 'Encrypted checkout';

  @override
  String get trustTransparentPricing => 'Clear pricing';

  @override
  String get trustLiveTracking => 'Live tracking';

  @override
  String get timelineTitle => 'Order progress';

  @override
  String get timelinePayment => 'Payment received';

  @override
  String get timelinePreparing => 'Preparing your top-up';

  @override
  String get timelineSending => 'Sending to operator';

  @override
  String get timelineDelivered => 'Delivered to line';

  @override
  String get trackingHeadlineDelivered => 'Credit is on its way';

  @override
  String get trackingBodyDelivered =>
      'Your payment is secure and the carrier is applying credit to the number you chose. You’ll see a confirmation reference when the network finishes.';

  @override
  String get trackingHeadlineNeedsHelp => 'We couldn’t finish this top-up';

  @override
  String get trackingBodyFailedCalm =>
      'Your payment went through safely — nothing was lost. Our team can review this order and help complete delivery. Save your order reference if you contact support.';

  @override
  String get trackingHeadlineRetrying => 'Taking another path to deliver';

  @override
  String get trackingBodyRetrying =>
      'Sometimes networks need a moment. We’re retrying delivery automatically so you don’t have to do anything yet.';

  @override
  String get trackingHeadlineSending => 'Sending credit now';

  @override
  String get trackingBodySending =>
      'Your package is moving to the mobile operator. This usually completes quickly.';

  @override
  String get trackingHeadlinePreparing => 'Preparing your top-up';

  @override
  String get trackingBodyPreparing =>
      'Your payment is confirmed. We’re lining up delivery to the correct network and number.';

  @override
  String get trackingHeadlinePaymentConfirming => 'Confirming your payment';

  @override
  String get trackingBodyPaymentConfirming =>
      'Your bank is finishing authorization. Sit tight — delivery will begin right after confirmation.';

  @override
  String get trackingHeadlinePaymentReceived => 'Payment secured';

  @override
  String get trackingBodyPaymentReceived =>
      'Stripe confirmed your payment. The next steps happen automatically on our side.';

  @override
  String get trackingHeadlineCatchingUp => 'Almost there';

  @override
  String get trackingBodyCatchingUp =>
      'We’re syncing the latest status. Your payment is recorded — check back in a minute or open recent orders.';

  @override
  String get trackingHeadlineVerifying => 'Confirming with the operator';

  @override
  String get trackingBodyVerifying =>
      'Your payment is secure. We’re verifying the final step with the mobile operator and only show “delivered” when we have proof it completed. This can take a little longer than usual.';

  @override
  String get trackingHeadlineSignIn => 'Sign in to see live status';

  @override
  String get trackingBodySignIn =>
      'Your payment is on file. Sign in to refresh delivery details whenever you like.';

  @override
  String get paymentSafeBanner =>
      'Your payment is protected. Charges are processed by Stripe — we never store your card.';

  @override
  String get cancelScreenTitle => 'Checkout paused';

  @override
  String get cancelScreenLead => 'No worries — you can try again anytime.';

  @override
  String get cancelScreenBody =>
      'Nothing was charged. When you’re ready, return to your order and continue with secure checkout.';

  @override
  String get cancelBackHome => 'Back to home';

  @override
  String get ordersScreenTitle => 'Recent orders';

  @override
  String get ordersEmptyTitle => 'No orders yet';

  @override
  String get ordersEmptyBody =>
      'After you complete a top-up, a receipt appears here on this device so you can track delivery.';

  @override
  String get ordersEmptyBodySignedIn =>
      'When you complete a top-up while signed in, your receipts stay with your account and sync here. You can still see device-only drafts from before sign-in.';

  @override
  String get ordersSourceAccount => 'Synced';

  @override
  String get ordersSourceDevice => 'This device';

  @override
  String get ordersCloudRefreshFailed =>
      'We couldn’t reach your account orders. Showing what’s saved on this device.';

  @override
  String get ordersDetailTitle => 'Order details';

  @override
  String get ordersSectionLive => 'Current status';

  @override
  String get ordersSectionRecord => 'Receipt';

  @override
  String get ordersCopyReference => 'Copy reference';

  @override
  String get ordersReferenceCopied => 'Reference copied';

  @override
  String get trackingHeadlineCancelled => 'This order was cancelled';

  @override
  String get trackingBodyCancelled =>
      'No charge was completed for this order. You can start a new top-up anytime.';

  @override
  String ordersLastUpdated(String time) {
    return 'Updated $time';
  }

  @override
  String get orderStatusDelivered => 'Delivered';

  @override
  String get orderStatusInProgress => 'In progress';

  @override
  String get orderStatusRetrying => 'Retrying';

  @override
  String get orderStatusFailed => 'Needs attention';

  @override
  String get orderStatusPaymentPending => 'Confirming payment';

  @override
  String get orderStatusCancelled => 'Cancelled';

  @override
  String get orderStatusSending => 'Sending';

  @override
  String get orderStatusVerifying => 'Confirming delivery';

  @override
  String get orderStatusPreparing => 'Preparing';

  @override
  String get hubTileOrdersTitle => 'Recent orders';

  @override
  String get hubTileOrdersSub => 'Receipts · synced when signed in';

  @override
  String get receiptPaymentPaid => 'Paid';

  @override
  String get receiptPaymentPending => 'Confirming';

  @override
  String get receiptFulfillmentDone => 'Sent';

  @override
  String get receiptFulfillmentProgress => 'Processing';

  @override
  String get receiptCarrierRef => 'Carrier reference';

  @override
  String get rechargeFailureCalmTitle => 'Checkout didn’t complete';

  @override
  String get rechargeFailureCalmBody =>
      'Nothing was charged. Check your connection and try again — your details are still here.';

  @override
  String get checkoutTrustCallout =>
      'You’ll complete payment on a secure Stripe page. Your card never passes through our servers.';

  @override
  String get loyaltyHubTitle => 'Family recognition';

  @override
  String get loyaltyHubSubtitle =>
      'Earn points from completed top-ups. No games or drawings — just transparent activity you control.';

  @override
  String get loyaltyLifetimePoints => 'Lifetime points';

  @override
  String get loyaltyMonthPoints => 'This month';

  @override
  String get loyaltyMonthRank => 'Monthly placement';

  @override
  String get loyaltyGroupPoints => 'Family group points';

  @override
  String get loyaltyGroupRank => 'Group placement';

  @override
  String get loyaltyLeaderboardTab => 'Leaderboard';

  @override
  String get loyaltyYouTab => 'You & family';

  @override
  String get loyaltyTopGroups => 'Top groups';

  @override
  String get loyaltyTopMembers => 'Top participants';

  @override
  String get loyaltyRecognitionBand => 'Recognition band';

  @override
  String get loyaltyProgressClimb =>
      'Move up the leaderboard with qualifying orders — never random chance.';

  @override
  String get loyaltyLegalFootnote =>
      'Points are based on successful orders only. There is no lottery, sweepstakes, or prize game.';

  @override
  String get loyaltyCreateGroup => 'Create family group';

  @override
  String get loyaltyJoinGroup => 'Join with invite code';

  @override
  String get loyaltyInviteHint =>
      'Owners can share the invite code from this screen. Keep it in trusted chats only.';

  @override
  String get loyaltyDissolveGroup => 'End group';

  @override
  String get loyaltyLeaveGroup => 'Leave group';

  @override
  String get loyaltyRefresh => 'Refresh';

  @override
  String get hubTileLoyaltyTitle => 'Family recognition';

  @override
  String get hubTileLoyaltySub => 'Points · leaderboard · invites';

  @override
  String loyaltyDaysLeft(int days) {
    return '$days days left this month';
  }

  @override
  String loyaltyPointsToRankAhead(int points, int rank) {
    return '$points pts to tie #$rank';
  }

  @override
  String loyaltyRanksToTier(int ranks, String tier) {
    return '$ranks ranks to reach $tier';
  }

  @override
  String loyaltyYouPlacement(String label) {
    return '$label this month';
  }

  @override
  String get loyaltyTightBehind =>
      'The field behind you is close — steady orders help hold your place.';

  @override
  String loyaltyChasingPack(int rank, int pts) {
    return '#$rank trails by $pts pts';
  }

  @override
  String get loyaltyProgressYourMonthTitle => 'Your monthly momentum';

  @override
  String get loyaltyProgressGroupTitle => 'Family monthly momentum';

  @override
  String get loyaltyProgressTierTitle => 'Tier runway';

  @override
  String get loyaltyProgressRankTitle => 'Closing on the rank ahead';

  @override
  String loyaltyGroupBoardGap(int pts) {
    return '$pts pts to move up vs top groups';
  }

  @override
  String loyaltyYourShareOfFamily(int pct) {
    return 'Your share of this month\'s family points: $pct%';
  }

  @override
  String get loyaltySoloFamilyMonth =>
      'You\'re setting the pace for your family\'s month.';

  @override
  String get loyaltyCarryingMost =>
      'You\'re carrying most of this month\'s family activity.';

  @override
  String get loyaltyAchievementsHeading => 'Milestones';

  @override
  String get loyaltyAchFirstOrderTitle => 'First qualifying order';

  @override
  String get loyaltyAchFirstOrderSub =>
      'Recognition starts with one completed top-up.';

  @override
  String get loyaltyAchCenturyTitle => '100 lifetime points';

  @override
  String get loyaltyAchCenturySub =>
      'Consistency adds up — thank you for staying with us.';

  @override
  String get loyaltyAchGroupTitle => 'Family orbit';

  @override
  String get loyaltyAchGroupSub =>
      'Your family group crossed a visibility milestone together.';

  @override
  String get loyaltyRankBadge => 'Rank';

  @override
  String get notifOrderPaymentTitle => 'Payment secured';

  @override
  String get notifOrderPaymentBody =>
      'Your top-up is confirmed. We’re preparing delivery now.';

  @override
  String get notifOrderPreparingTitle => 'Preparing your top-up';

  @override
  String get notifOrderPreparingBody =>
      'We’re aligning delivery with the network you selected.';

  @override
  String get notifOrderSendingTitle => 'Sending to the operator';

  @override
  String get notifOrderSendingBody =>
      'Credit is on the way — most finish within a few minutes.';

  @override
  String get notifOrderDeliveredTitle => 'Delivered';

  @override
  String get notifOrderDeliveredBody =>
      'Your line should show the top-up. Tap to view your receipt.';

  @override
  String get notifOrderRetryingTitle => 'Taking another moment';

  @override
  String get notifOrderRetryingBody =>
      'The network asked for a retry — we’re handling it for you.';

  @override
  String get notifOrderFailedTitle => 'We’re here to help';

  @override
  String get notifOrderFailedBody =>
      'Your payment stayed protected. Open the order for calm next steps.';

  @override
  String get notifInboxTitle => 'Updates';

  @override
  String get notifInboxEmpty =>
      'You’re all caught up. We’ll let you know when something changes.';

  @override
  String get notifHubTooltip => 'Notifications';

  @override
  String get notifLoyaltyRankUpTitle => 'You moved up';

  @override
  String get notifLoyaltyRankUpBody =>
      'Your monthly standing improved — see Family recognition.';

  @override
  String get notifLoyaltyRankDownTitle => 'Rankings shifted';

  @override
  String get notifLoyaltyRankDownBody =>
      'Others moved ahead this month — steady activity keeps you in the race.';

  @override
  String get notifLoyaltyMilestoneTitle => 'Points milestone';

  @override
  String get notifLoyaltyMilestoneBody =>
      'You crossed a recognition milestone — open Family recognition.';

  @override
  String get notifLoyaltyMonthUrgencyTitle => 'Month closing soon';

  @override
  String get notifLoyaltyMonthUrgencyBody =>
      'Just a few days left to firm up this month’s placement.';

  @override
  String get notifMarkAllRead => 'Mark all read';

  @override
  String get helpCenterTitle => 'Help center';

  @override
  String get helpCenterSubtitle =>
      'Straight answers about payments, delivery, and your orders — in plain language.';

  @override
  String get helpSectionPaymentTitle => 'Payment safety';

  @override
  String get helpSectionPaymentBody =>
      'Checkout runs on Stripe’s secure page. Zora-Walat never sees or stores your full card number. If a charge appears, your bank authorized it — we only complete the top-up you confirmed.';

  @override
  String get helpSectionDeliveryTitle => 'Delivery timing';

  @override
  String get helpSectionDeliveryBody =>
      'Most Afghan mobile top-ups finish within a few minutes. Operator networks occasionally need extra time. Pull to refresh on your order — status updates as soon as our partners report back.';

  @override
  String get helpSectionRetryTitle => 'Retries and short delays';

  @override
  String get helpSectionRetryBody =>
      'When a network asks for another attempt, our systems retry automatically. You don’t need to pay again. If an order stays unusual longer than expected, your payment record stays safe while we work with the operator.';

  @override
  String get helpSectionTrackingTitle => 'Order tracking';

  @override
  String get helpSectionTrackingBody =>
      'Recent orders show the same stages you’d expect from a carrier: payment confirmed, preparation, handoff to the operator, then delivered. Anything that needs your attention is labeled clearly — never hidden in technical jargon.';

  @override
  String get helpSectionLoyaltyTitle => 'Rewards and family points';

  @override
  String get helpSectionLoyaltyBody =>
      'Successful top-ups earn recognition points for you and optional family groups. There’s no random drawing — placement reflects real activity you can see on the leaderboard.';

  @override
  String get helpSectionContactTitle => 'Contact and next steps';

  @override
  String get helpSectionContactBody =>
      'Open any order and tap “Copy for support” to grab a professional summary (order reference, network, masked number, statuses, and time). Share that with whoever assists you — it’s the fastest way to get precise help without exposing private details.';

  @override
  String get helpOpenLoyalty => 'Open family recognition';

  @override
  String get supportNeedHelp => 'Need help?';

  @override
  String get supportOpenHelpCenter => 'Help center';

  @override
  String get supportCopyPacket => 'Copy for support';

  @override
  String get supportPacketCopied => 'Support summary copied';

  @override
  String get supportPacketHeader => 'Zora-Walat — support summary';

  @override
  String get supportPacketOrderRef => 'Order reference';

  @override
  String get supportPacketRoute => 'Route';

  @override
  String get supportPacketRouteValue => 'Mobile top-up (airtime / data)';

  @override
  String get supportPacketRecipient => 'Recipient (masked)';

  @override
  String get supportPacketUpdated => 'Last updated';

  @override
  String get supportAssistRetryingTitle => 'We’re retrying automatically';

  @override
  String get supportAssistRetryingBody =>
      'The operator network requested another delivery attempt. That’s common — our systems handle retries so you don’t have to start over or pay twice.';

  @override
  String get supportAssistRetryingNext =>
      'Best next step: wait a few minutes, then pull down to refresh. You’ll see each update here.';

  @override
  String get supportAssistDelayedTitle => 'Still catching up';

  @override
  String get supportAssistDelayedBody =>
      'This order is taking a bit longer than usual to sync or deliver. Your payment is already logged — nothing disappears when timing stretches.';

  @override
  String get supportAssistDelayedNext =>
      'Best next step: refresh this screen, check recent orders, and sign in if prompted so live status can sync.';

  @override
  String get supportAssistFailedTitle => 'We’re reviewing with care';

  @override
  String get supportAssistFailedBody =>
      'Delivery didn’t finish on the first path, but your payment stayed protected. Our team and partners can reconcile using your order reference — no need to panic or repeat payment.';

  @override
  String get supportAssistFailedNext =>
      'Best next step: copy the support summary from this screen and share it when you reach out. Keep the app handy for updates.';

  @override
  String get supportAssistPaymentConfirmTitle => 'Payment still confirming';

  @override
  String get supportAssistPaymentConfirmBody =>
      'Your bank or card network is finishing authorization. That can take a short moment. We don’t start delivery until payment is fully confirmed — your line isn’t charged twice.';

  @override
  String get supportAssistPaymentConfirmNext =>
      'Best next step: stay on this screen briefly; if it lingers, refresh or check your recent orders after a minute.';

  @override
  String get supportAssistOperatorTitle => 'Waiting on operator confirmation';

  @override
  String get supportAssistOperatorBody =>
      'Credit has left our side and is with the mobile operator. Most confirmations arrive quickly; some networks batch their acknowledgements.';

  @override
  String get supportAssistOperatorNext =>
      'Best next step: give it a few minutes, refresh, then check the recipient’s balance on the network if needed.';

  @override
  String get supportAssistVerifyingTitle => 'Still confirming safely';

  @override
  String get supportAssistVerifyingBody =>
      'Your payment is protected. The operator has not yet given us final confirmation, so we keep this order in a careful review state instead of guessing. Nothing is lost while we verify.';

  @override
  String get supportAssistVerifyingNext =>
      'Best next step: wait a few minutes, refresh recent orders, and contact support with your order reference if it stays here for an unusually long time.';

  @override
  String get supportAssistCancelledTitle => 'Order cancelled';

  @override
  String get supportAssistCancelledBody =>
      'This session stopped before a successful charge. You can start a fresh top-up whenever you like — nothing here is stuck in limbo.';

  @override
  String get supportAssistCancelledNext =>
      'Best next step: return to recharge, double-check the number, and complete checkout again if you still need airtime.';

  @override
  String get supportReassuranceFooter =>
      'Payment safety and careful review stay on our side — you’ll always see honest status here.';

  @override
  String get supportOrderListHelpTooltip => 'Help';

  @override
  String get hubTileHelpTitle => 'Help & support';

  @override
  String get hubTileHelpSub => 'Guides · payment safety · copy order details';

  @override
  String get ordersDetailLoadingHint => 'Loading your receipt…';

  @override
  String get ordersEmptySupportLine =>
      'Questions? Open Help & support from home for calm guidance.';

  @override
  String get referralCenterTitle => 'Invite & earn';

  @override
  String get referralCenterSubtitle =>
      'Share Zora-Walat with people you trust. Clear rewards, honest rules — built for families topping up from abroad.';

  @override
  String get referralTrustLine =>
      'Rewards are verified automatically when your friend’s first top-up completes successfully. No gimmicks — just a thank-you for growing the community.';

  @override
  String get referralProgramPaused =>
      'Invites are paused for now. Please check back later — we’ll announce when sharing is open again.';

  @override
  String get referralYourCode => 'Your invite code';

  @override
  String get referralCopyCode => 'Copy code';

  @override
  String get referralCodeCopied => 'Code copied';

  @override
  String get referralCopyInviteMessage => 'Copy invite message';

  @override
  String get referralInviteMessageCopied => 'Invite message copied';

  @override
  String referralInviteMessageTemplate(String code) {
    return 'I use Zora-Walat for trusted Afghanistan mobile top-ups. Join with my code: $code';
  }

  @override
  String get referralHowItWorksTitle => 'How rewards work';

  @override
  String referralHowItWorksBody(String rewardUsd, String minUsd) {
    return 'When a friend creates an account with your code and their first top-up is successfully delivered — for at least $minUsd — you earn $rewardUsd in wallet credit for future purchases. One reward per friend.';
  }

  @override
  String get referralRewardRulesFootnote =>
      'Wallet credits from invites are for top-ups only and can’t be withdrawn as cash. That protects everyone and keeps pricing fair.';

  @override
  String get referralWeeklyFairTitle => 'Fair sharing each week';

  @override
  String get referralWeeklyFairBody =>
      'Invite rewards come from a shared weekly pool so many families can participate. If a week is especially busy, some invites may finish qualifying even when the pool needs a fresh start — your friends still get the service they paid for.';

  @override
  String get referralStatsInvited => 'Invited';

  @override
  String get referralStatsSuccessful => 'Successful';

  @override
  String get referralStatsEarned => 'Earned';

  @override
  String get referralHistoryTitle => 'Your invites';

  @override
  String get referralHistoryEmpty =>
      'When you share your code, each friend will appear here with a calm, simple status.';

  @override
  String get referralStatusPending => 'In progress';

  @override
  String get referralStatusCompleted => 'Qualified';

  @override
  String get referralStatusRewarded => 'Rewarded';

  @override
  String get referralStatusRejected => 'Not rewarded';

  @override
  String get referralPendingHint =>
      'We’re waiting for your friend’s first successful top-up to finish.';

  @override
  String get referralCompletedHint =>
      'Qualified — your reward is being finalized.';

  @override
  String get referralRewardedHint =>
      'Thank you — credit is in your wallet for future top-ups.';

  @override
  String get referralRejectedDetailBudget =>
      'This week’s invite rewards were already fully allocated. Your friend’s service still went through — thank you for sharing Zora-Walat.';

  @override
  String get referralRejectedDetailWeeklyCap =>
      'You’ve reached this week’s invite reward limit. You can invite again next week.';

  @override
  String get referralRejectedDetailLifetimeCap =>
      'You’ve reached the long-term invite reward limit for your account. We appreciate how much you’ve shared Zora-Walat.';

  @override
  String get referralRejectedDetailNotEligible =>
      'This invite didn’t meet the reward guidelines. Your friend can still use Zora-Walat normally.';

  @override
  String get referralRejectedDetailGeneric =>
      'This invite didn’t receive a reward. If you have questions, use Help & support with your account signed in.';

  @override
  String referralRewardAmountLine(String amount) {
    return 'Reward: $amount';
  }

  @override
  String get hubTileReferralTitle => 'Invite & earn';

  @override
  String get hubTileReferralSub => 'Share your code · wallet rewards';
}
