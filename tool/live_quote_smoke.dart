// ignore_for_file: avoid_print
// One-shot: same host/path as ApiService.postCheckoutPricingQuotePublic.
// Run: dart run tool/live_quote_smoke.dart
import 'package:http/http.dart' as http;

Future<void> main() async {
  const base = 'http://127.0.0.1:8787';
  final uri = Uri.parse('$base/api/checkout-pricing-quote');
  final res = await http.post(
    uri,
    headers: const {'Content-Type': 'application/json'},
    body:
        '{"currency":"usd","senderCountry":"US","operatorKey":"roshan","recipientPhone":"0701234567","amountUsdCents":500}',
  );
  print('LIVE_QUOTE_SMOKE url=$uri status=${res.statusCode}');
  print(res.body);
}
