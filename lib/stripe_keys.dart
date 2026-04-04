/// Stripe **publishable** key only (`pk_…`). Never add secret keys (`sk_…`) in client code.
///
/// Set at build time: `--dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_...`
/// Empty default avoids committing account-specific keys into the repository.
abstract final class StripeKeys {
  static const String publishableKey = String.fromEnvironment(
    'STRIPE_PUBLISHABLE_KEY',
    defaultValue: '',
  );
}