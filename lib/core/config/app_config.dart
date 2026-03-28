/// Compile-time and environment configuration.
///
/// Stripe: pass publishable key at build/run time:
/// `flutter run --dart-define=STRIPE_PUBLISHABLE_KEY=<publishable key from Dashboard>`
abstract final class AppConfig {
  static const String appName = 'Zora-Walat';

  /// Stripe publishable key (safe in client apps). Empty until you define it.
  static const String stripePublishableKey = String.fromEnvironment(
    'STRIPE_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// MVP Node API + legacy BFF (no trailing slash). Chrome: `http://localhost:3000`.
  /// Android emulator → `http://10.0.2.2:3000`.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Alias for telecom/catalog calls (same host as [apiBaseUrl] in MVP).
  static const String paymentsApiBaseUrl = String.fromEnvironment(
    'PAYMENTS_API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Optional shared secret; send as `X-Api-Key` on `/payment-intents` and catalog.
  static const String bffApiKey = String.fromEnvironment(
    'BFF_API_KEY',
    defaultValue: '',
  );
}
