import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint, kReleaseMode;
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../core/auth/email_verification_required_exception.dart';
import '../core/auth/unauthorized_exception.dart';
import '../core/config/app_config.dart';
import 'api_service.dart';
import 'checkout_url_launch.dart';

class PaymentService {
  const PaymentService({required this.api});

  final ApiService api;

  /// Same order of magnitude as Next.js `CHECKOUT_FETCH_TIMEOUT_MS` — prevents infinite spinner.
  static const Duration _checkoutApiTimeout = Duration(seconds: 55);

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
    if (api.baseUrl.isEmpty) {
      throw StateError(
        'API base URL is not configured. Set --dart-define=API_BASE_URL=https://your-api-host.example',
      );
    }
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
      response = await api
          .postAuthedWithExtraHeaders(
            '/create-checkout-session',
            body: body,
            extraHeaders: {'Idempotency-Key': idempotencyKey},
          )
          .timeout(_checkoutApiTimeout);
    } on UnauthorizedException catch (_) {
      if (kReleaseMode || devBypassSecret.isEmpty) {
        rethrow;
      }
      response = await api
          .postCheckoutSessionWithDevBypass(
            '/create-checkout-session',
            body: body,
            devSecret: devBypassSecret,
            extraHeaders: {'Idempotency-Key': idempotencyKey},
          )
          .timeout(_checkoutApiTimeout);
    } on EmailVerificationRequiredException {
      // Preserved for UI: checkout is blocked until email is verified (HTTP 403 + code).
      rethrow;
    } on TimeoutException catch (_) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] checkout API timeout after $_checkoutApiTimeout');
      }
      throw StateError(
        kReleaseMode
            ? 'Checkout timed out. Please try again.'
            : 'Checkout API timed out after ${_checkoutApiTimeout.inSeconds}s.\n'
                'Check that the backend is running at ${AppConfig.apiBaseUrl}.',
      );
    } on http.ClientException catch (e) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] transport error (checkout): $e');
      }
      throw StateError(
        kReleaseMode
            ? 'Network error calling checkout API.'
            : 'Network error calling checkout API.\n'
                'Check CORS, --dart-define=API_BASE_URL, and that the backend is reachable at '
                '${AppConfig.apiBaseUrl}.\n$e',
      );
    } catch (e) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] checkout request failed: $e');
      }
      throw StateError(
        kReleaseMode
            ? 'Checkout request failed.'
            : 'Checkout request failed.\n$e',
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
