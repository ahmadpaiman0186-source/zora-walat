/// **Flutter → Node API:** base URL for all REST calls (`ApiService`, `AuthApiService`, etc.).
///
/// **Source of truth** for the backend origin:
/// - Default: `http://127.0.0.1:8787` (matches server `PORT` default).
/// - Override at build/run: `--dart-define=API_BASE_URL=https://your-api.example`
///
/// Do not scatter other base URLs; import [AppConfig] or pass the same string from [main].
abstract final class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8787',
  );

  /// Debug-only full URL string; HTTP calls use [ApiService] paths relative to [apiBaseUrl].
  static String get createCheckoutSessionUrl {
    final base = apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    return '$base/create-checkout-session';
  }
}
