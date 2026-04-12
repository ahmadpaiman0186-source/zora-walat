import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:zora_walat/core/auth/auth_session.dart';
import 'package:zora_walat/services/api_service.dart';
import 'package:zora_walat/services/payment_service.dart';

/// Captures the JSON body sent to checkout for regression on Phase 1 request shape.
class _RecordingApiService extends ApiService {
  _RecordingApiService({
    required super.client,
    required super.authSession,
    required super.authApi,
  }) : super(baseUrlOverride: 'https://stub.test');

  Map<String, dynamic>? lastCheckoutBody;

  @override
  Future<http.Response> postAuthedWithExtraHeaders(
    String path, {
    required Map<String, dynamic> body,
    Map<String, String> extraHeaders = const {},
  }) async {
    lastCheckoutBody = Map<String, dynamic>.from(body);
    return http.Response(jsonEncode({'url': 'https://checkout.stripe.test/c/pay/cs_test'}), 200);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const launcher = MethodChannel('plugins.flutter.io/url_launcher');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(launcher, (call) async {
    if (call.method == 'launch' || call.method == 'canLaunch') {
      return true;
    }
    return null;
  });

  test('PaymentService package checkout omits amountUsdCents; includes catalog fields', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final session = AuthSession(prefs);
    await session.setTokens(access: 'test-access-token', refresh: 'rt');

    final api = _RecordingApiService(
      client: http.Client(),
      authSession: session,
      authApi: null,
    );
    final payment = PaymentService(api: api);

    await payment.startCheckout(
      amountUsdCents: 9999,
      senderCountry: 'US',
      currency: 'usd',
      operatorKey: 'mtn',
      recipientPhone: '701234567',
      packageId: 'mock_mtn_5usd',
    );

    final body = api.lastCheckoutBody;
    expect(body, isNotNull);
    expect(body!['currency'], 'usd');
    expect(body['senderCountry'], 'US');
    expect(body['packageId'], 'mock_mtn_5usd');
    expect(body['operatorKey'], 'mtn');
    expect(body['recipientPhone'], '701234567');
    expect(body.containsKey('amountUsdCents'), false);
  });

  test('PaymentService amount-only checkout sends amountUsdCents, no packageId', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final session = AuthSession(prefs);
    await session.setTokens(access: 'test-access-token', refresh: 'rt');

    final api = _RecordingApiService(
      client: http.Client(),
      authSession: session,
      authApi: null,
    );
    final payment = PaymentService(api: api);

    await payment.startCheckout(
      amountUsdCents: 2500,
      senderCountry: 'CA',
      currency: 'usd',
      operatorKey: 'roshan',
      recipientPhone: '799000111',
    );

    final body = api.lastCheckoutBody;
    expect(body!['amountUsdCents'], 2500);
    expect(body.containsKey('packageId'), false);
  });
}
