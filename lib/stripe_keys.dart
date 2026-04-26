/// Stripe **publishable** key only (`pk_…`). Never add secret keys (`sk_…`) in client code.
///
/// Set at build time: `--dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_...` (see [AppConfig] in
/// `app_config.dart` for a full local `flutter run` example with `API_BASE_URL`).
/// Empty default avoids committing account-specific keys into the repository.
abstract final class StripeKeys {
  static const String publishableKey = String.fromEnvironment(
    'STRIPE_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// Lowercase ISO 4217 code sent to Stripe Checkout (`currency` field).
  static const String stripeCheckoutCurrencyCode = 'usd';
}