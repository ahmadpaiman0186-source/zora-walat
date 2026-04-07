import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint, kReleaseMode;
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../core/auth/unauthorized_exception.dart';
import '../core/config/app_config.dart';
import 'api_service.dart';
import 'checkout_url_launch.dart';

class PaymentService {
  const PaymentService({required this.api});

  final ApiService api;

  /// Hosted Stripe Checkout: server resolves trusted amount (from [packageId] or allow-list).
  ///
  /// [senderCountry] must be a Phase 1 region code (US, CA, EU, AE, TR) — drives server risk buffer.
  /// [operatorKey] + [recipientPhone] must both be set when either is provided.
  /// Requires a valid access token on [api] (same as wallet/recharge).
  /// When [packageId] is set, [amountUsdCents] is not sent; the server prices from catalog only.
  Future<void> startCheckout({
    required int amountUsdCents,
    required String senderCountry,
    String currency = 'usd',
    String? operatorKey,
    String? recipientPhone,
    String? packageId,
  }) async {
    final idempotencyKey = const Uuid().v4();

    final body = <String, dynamic>{
      'currency': currency,
      'senderCountry': senderCountry,
    };
    if (packageId == null) {
      body['amountUsdCents'] = amountUsdCents;
    }
    if (operatorKey != null) body['operatorKey'] = operatorKey;
    if (recipientPhone != null) body['recipientPhone'] = recipientPhone;
    if (packageId != null) body['packageId'] = packageId;

    if (!kReleaseMode) {
      debugPrint(
        '[PaymentService] POST ${AppConfig.createCheckoutSessionUrl} (checkout)',
      );
    }

    const devBypassSecret = String.fromEnvironment(
      'DEV_CHECKOUT_BYPASS_SECRET',
      defaultValue: '',
    );

    late final http.Response response;
    try {
      response = await api.postAuthedWithExtraHeaders(
        '/create-checkout-session',
        body: body,
        extraHeaders: {'Idempotency-Key': idempotencyKey},
      );
    } on UnauthorizedException catch (_) {
      if (kReleaseMode || devBypassSecret.isEmpty) {
        rethrow;
      }
      response = await api.postCheckoutSessionWithDevBypass(
        '/create-checkout-session',
        body: body,
        devSecret: devBypassSecret,
        extraHeaders: {'Idempotency-Key': idempotencyKey},
      );
    } catch (e) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] network error (checkout)');
      }
      throw StateError(
        kReleaseMode
            ? 'Network error calling checkout API.'
            : 'Network error calling checkout API.\n'
                'Is the backend running at ${AppConfig.apiBaseUrl}?\n$e',
      );
    }

    if (!kReleaseMode) {
      debugPrint('[PaymentService] HTTP ${response.statusCode}');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] error status ${response.statusCode}');
      }
      throw StateError(
        kReleaseMode
            ? 'Checkout unavailable. Please try again.'
            : 'Checkout unavailable (HTTP ${response.statusCode}).\n'
                '${response.body}',
      );
    }

    late final Object? data;
    try {
      data = jsonDecode(response.body);
    } catch (e) {
      throw StateError('Checkout bad response (not JSON).\n${response.body}');
    }
    if (data is! Map<String, dynamic> || data['url'] is! String) {
      throw StateError('Checkout bad response (missing url).\nRaw: $data');
    }

    final checkoutUri = Uri.parse(data['url'] as String);
    await openStripeCheckoutPage(checkoutUri);
  }
}
