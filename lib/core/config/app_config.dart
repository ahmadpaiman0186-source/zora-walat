import 'package:flutter/foundation.dart' show kDebugMode;

/// **Flutter → Node API:** base URL for all REST calls (`ApiService`, `AuthApiService`, etc.).
///
/// **Source of truth:** compile-time `API_BASE_URL` (matches Next.js `NEXT_PUBLIC_API_URL` intent).
/// - Production / CI: `--dart-define=API_BASE_URL=https://api.yourdomain.com` (must be a **public**
///   API host — not behind Vercel deployment SSO).
/// - Local: `--dart-define=API_BASE_URL=http://127.0.0.1:8787`
///
/// **Debug default:** when `API_BASE_URL` is unset, [apiBaseUrl] falls back to `http://127.0.0.1:8787`
/// so `flutter run` without `--dart-define` still hits a local Node API (Next.js env files are not read
/// by Flutter).
///
/// **Stripe (hosted checkout):** publishable key is compile-time only — [StripeKeys] in
/// `lib/stripe_keys.dart` uses `STRIPE_PUBLISHABLE_KEY`. Example local Chrome run:
/// `flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8787 --dart-define=STRIPE_PUBLISHABLE_KEY=pk_test_...`
/// (use your test key; never commit keys).
///
/// Release builds: leave `API_BASE_URL` empty unless you pass `--dart-define` (no silent prod host).
abstract final class AppConfig {
  /// Normalizes operator input: trims, drops trailing slashes, strips a trailing `/api`
  /// so paths like `/api/auth/...` do not become `/api/api/auth/...`.
  static String normalizeApiBase(String raw) {
    var t = raw.trim().replaceAll(RegExp(r'/+$'), '');
    while (t.endsWith('/api')) {
      t = t.substring(0, t.length - 4);
    }
    return t;
  }

  /// Effective API host root (no trailing `/`, no trailing `/api`).
  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    var t = normalizeApiBase(fromEnv);
    if (t.isEmpty && kDebugMode) {
      t = normalizeApiBase('http://127.0.0.1:8787');
    }
    return t;
  }

  /// Debug-only full URL string; HTTP calls use [ApiService] paths relative to [apiBaseUrl].
  static String get createCheckoutSessionUrl {
    final base = apiBaseUrl;
    if (base.isEmpty) return '';
    return '$base/create-checkout-session';
  }

  /// `POST /api/checkout-pricing-quote` — public pricing preview; response includes `pricingBreakdown`.
  static String get checkoutPricingQuoteUrl {
    final base = apiBaseUrl;
    if (base.isEmpty) return '';
    return '$base/api/checkout-pricing-quote';
  }
}
