/// Compile-time and environment configuration.
///
/// Stripe publishable key: set in `lib/stripe_keys.dart` ([StripeKeys.publishableKey]).
/// Local API: run Node server in `/server` on port 8787 (`npm start`).
abstract final class AppConfig {
  static const String appName = 'Zora-Walat';

  static const String apiBaseUrl = 'http://localhost:8787';

  static const String paymentsApiBaseUrl = 'http://localhost:8787';

  static const String bffApiKey = String.fromEnvironment(
    'BFF_API_KEY',
    defaultValue: '',
  );
}
