/// **Flutter → Node API:** base URL for all REST calls (`ApiService`, `AuthApiService`, etc.).
///
/// **Source of truth:** compile-time `API_BASE_URL` (matches Next.js `NEXT_PUBLIC_API_URL` intent).
/// - Production / CI: `--dart-define=API_BASE_URL=https://api.yourdomain.com` (must be a **public**
///   API host — not behind Vercel deployment SSO).
/// - Local: `--dart-define=API_BASE_URL=http://127.0.0.1:8787`
///
/// Default is empty so release builds do not silently call a stale or protected hostname.
abstract final class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  /// Debug-only full URL string; HTTP calls use [ApiService] paths relative to [apiBaseUrl].
  static String get createCheckoutSessionUrl {
    final base = apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (base.isEmpty) return '';
    return '$base/create-checkout-session';
  }
}
