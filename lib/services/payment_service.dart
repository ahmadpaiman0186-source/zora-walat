import 'dart:convert';

import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../core/config/app_config.dart';
import '../features/payments/domain/payment_result.dart';
import '../features/telecom/domain/telecom_order.dart';
import '../models/recharge_draft.dart';
import '../stripe_keys.dart';

typedef PaymentIntentResolution = ({
  String clientSecret,
  String? paymentIntentId,
});

typedef PaymentIntentClientSecretResolver = Future<PaymentIntentResolution> Function({
  required int amountUsdCents,
  required String currency,
  required Map<String, String> metadata,
});

/// Client-side Stripe configuration (publishable key only).
abstract final class PaymentClientConfig {
  PaymentClientConfig._();

  /// Normalized publishable key (trimmed; no surrounding whitespace).
  static String get normalizedPublishableKey =>
      StripeKeys.publishableKey.trim();

  /// True when the key looks like a Stripe publishable key (`pk_test_` / `pk_live_`).
  static bool get isStripeConfigured {
    final k = normalizedPublishableKey.replaceAll(RegExp(r'\s'), '');
    return k.startsWith('pk_test_') || k.startsWith('pk_live_');
  }
}

/// Abstraction for checkout. Swap implementations for tests or alternative PSPs.
abstract class PaymentService {
  Future<PaymentResult> pay(TelecomOrder order);

  Future<PaymentResult> payRechargeDraft(RechargeDraft draft);
}

/// Stripe PaymentSheet: [PaymentIntent] is created on the server; this class only
/// uses the publishable key and [client_secret] from your backend.
class StripePaymentService implements PaymentService {
  StripePaymentService({
    PaymentIntentClientSecretResolver? resolveClientSecret,
    http.Client? httpClient,
  })  : _resolveClientSecret = resolveClientSecret ?? _defaultResolver,
        _http = httpClient ?? http.Client();

  final PaymentIntentClientSecretResolver _resolveClientSecret;
  final http.Client _http;

  static Future<PaymentIntentResolution> _defaultResolver({
    required int amountUsdCents,
    required String currency,
    required Map<String, String> metadata,
  }) async {
    final base = AppConfig.paymentsApiBaseUrl.trim();
    if (base.isEmpty) {
      throw StateError(
        'Set PAYMENTS_API_BASE_URL and implement POST /payment-intents on your backend, '
        'or inject a custom PaymentIntentClientSecretResolver.',
      );
    }

    final uri = Uri.parse('$base/api/payment-intents');
    final client = http.Client();
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Idempotency-Key': const Uuid().v4(),
        if (AppConfig.bffApiKey.isNotEmpty) 'X-Api-Key': AppConfig.bffApiKey,
      };

      final res = await client.post(
        uri,
        headers: headers,
        body: jsonEncode({
          'amount': amountUsdCents,
          'currency': currency,
          'metadata': metadata,
        }),
      );

      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw StateError('Payment API error ${res.statusCode}: ${res.body}');
      }

      final map = jsonDecode(res.body) as Map<String, dynamic>;
      final secret = map['clientSecret'] as String?;
      if (secret == null || secret.isEmpty) {
        throw StateError('Backend response missing clientSecret');
      }
      final piId = map['paymentIntentId'] as String?;
      return (clientSecret: secret, paymentIntentId: piId);
    } finally {
      client.close();
    }
  }

  @override
  Future<PaymentResult> pay(TelecomOrder order) async {
    try {
      final metadata = <String, String>{
        ...order.metadata,
        'product_id': order.productId,
        'operator': order.operator.apiKey,
        'service_line': order.line.name,
        'phone_submitted': order.phone.raw,
      };

      final resolved = await _resolveClientSecret(
        amountUsdCents: order.finalUsdCents,
        currency: 'usd',
        metadata: metadata,
      );

      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: resolved.clientSecret,
          merchantDisplayName: AppConfig.appName,
          style: ThemeMode.dark,
        ),
      );

      await Stripe.instance.presentPaymentSheet();
      return PaymentSuccess(paymentIntentId: resolved.paymentIntentId);
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) {
        return const PaymentCancelled();
      }
      return PaymentFailure(e.error.localizedMessage ?? e.toString());
    } catch (e) {
      return PaymentFailure(_paymentErrorMessage(e));
    }
  }

  @override
  Future<PaymentResult> payRechargeDraft(RechargeDraft draft) async {
    final cents = (draft.amountUsd * 100).round();
    if (cents <= 0) {
      return const PaymentFailure('Invalid amount');
    }

    try {
      final metadata = <String, String>{
        'phone_submitted': draft.phoneE164Style,
        'operator': draft.operatorKey,
        'service_line': RechargeDraftConstants.serviceLine,
        'product_id': RechargeDraftConstants.productId,
      };

      final resolved = await _resolveRechargeDraft(
        amountUsdCents: cents,
        metadata: metadata,
      );

      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: resolved.clientSecret,
          merchantDisplayName: AppConfig.appName,
          style: ThemeMode.dark,
        ),
      );

      await Stripe.instance.presentPaymentSheet();
      return PaymentSuccess(paymentIntentId: resolved.paymentIntentId);
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) {
        return const PaymentCancelled();
      }
      return PaymentFailure(e.error.localizedMessage ?? e.toString());
    } catch (e) {
      return PaymentFailure(_paymentErrorMessage(e));
    }
  }

  static String _paymentErrorMessage(Object e) {
    final s = e.toString();
    if (s.contains('Stripe not configured') ||
        s.contains('STRIPE_SECRET_KEY')) {
      return 'Server payment setup: add STRIPE_SECRET_KEY to server/.env (test secret), '
          'restart the API, then try again.';
    }
    if (s.contains('PAYMENTS_API_BASE_URL') ||
        s.contains('payment-intents') ||
        s.contains('Payment API error') ||
        s.contains('Failed host lookup') ||
        s.contains('Connection refused') ||
        s.contains('Failed to fetch') ||
        s.contains('ClientException') ||
        s.contains('SocketException')) {
      return 'Payment service is unavailable. Check the API is running at '
          '${AppConfig.paymentsApiBaseUrl} and try again.';
    }
    return s;
  }

  Future<PaymentIntentResolution> _resolveRechargeDraft({
    required int amountUsdCents,
    required Map<String, String> metadata,
  }) async {
    final base = AppConfig.paymentsApiBaseUrl.trim();
    if (base.isEmpty) {
      throw StateError(
        'Set PAYMENTS_API_BASE_URL to your API origin (no trailing slash), '
        'e.g. http://10.0.2.2:8787 for Android emulator.',
      );
    }

    final uri = Uri.parse('$base/api/payment-intents/recharge-draft');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Idempotency-Key': const Uuid().v4(),
      if (AppConfig.bffApiKey.isNotEmpty) 'X-Api-Key': AppConfig.bffApiKey,
    };

    final res = await _http.post(
      uri,
      headers: headers,
      body: jsonEncode({
        'amount': amountUsdCents,
        'currency': 'usd',
        'metadata': metadata,
      }),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError('Payment API error ${res.statusCode}: ${res.body}');
    }

    final map = jsonDecode(res.body) as Map<String, dynamic>;
    final secret = map['clientSecret'] as String?;
    if (secret == null || secret.isEmpty) {
      throw StateError('Backend response missing clientSecret');
    }
    final piId = map['paymentIntentId'] as String?;
    return (clientSecret: secret, paymentIntentId: piId);
  }

  void dispose() {
    _http.close();
  }
}
