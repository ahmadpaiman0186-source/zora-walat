import 'dart:async' show TimeoutException, unawaited;
import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint, kReleaseMode;
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../core/auth/email_verification_required_exception.dart';
import '../core/auth/unauthorized_exception.dart';
import '../core/config/app_config.dart';
import '../models/checkout_pricing_breakdown.dart';
import '../models/checkout_pricing_quote_response.dart';
import 'api_service.dart';
import 'checkout_errors.dart';
import 'checkout_url_launch.dart';

class PaymentService {
  const PaymentService({required this.api});

  final ApiService api;

  /// User-facing: fail before the pay button appears stuck (checkout only).
  static const Duration _checkoutApiTimeout = Duration(seconds: 15);
  static const Duration _pricingQuoteApiTimeout = Duration(seconds: 55);

  static Map<String, dynamic> _checkoutRequestBody({
    required int amountCents,
    required String senderCountry,
    String currency = 'usd',
    String? operatorKey,
    String? recipientPhone,
    String? packageId,
    Map<String, dynamic>? billingJurisdiction,
  }) {
    final body = <String, dynamic>{
      'currency': currency,
      'senderCountry': senderCountry,
    };
    if (packageId == null) {
      body['amountUsdCents'] = amountCents;
    }
    if (operatorKey != null) body['operatorKey'] = operatorKey;
    if (recipientPhone != null) body['recipientPhone'] = recipientPhone;
    if (packageId != null) body['packageId'] = packageId;
    if (billingJurisdiction != null && billingJurisdiction.isNotEmpty) {
      body['billingJurisdiction'] = billingJurisdiction;
    }
    return body;
  }

  /// Hosted Stripe Checkout: server resolves trusted amount (from [packageId] or allow-list).
  ///
  /// [senderCountry] must be a Phase 1 region code (US, CA, EU, AE, TR) — drives server risk buffer.
  /// [operatorKey] + [recipientPhone] must both be set when either is provided.
  /// Requires a valid access token on [api] (same as wallet/recharge).
  /// When [packageId] is set, [amountCents] is not sent; the server prices from catalog only.
  ///
  /// `POST /api/checkout-pricing-quote` only (no auth). Content-Type: application/json.
  /// See [AppConfig.checkoutPricingQuoteUrl] for the path shape; the request host is [api.baseUrl].
  Future<CheckoutPricingQuoteResponse?> fetchCheckoutPricingQuote({
    required int amountCents,
    required String senderCountry,
    String currency = 'usd',
    String? operatorKey,
    String? recipientPhone,
    String? packageId,
    Map<String, dynamic>? billingJurisdiction,
  }) async {
    if (api.baseUrl.isEmpty) {
      throw StateError(
        'API base URL is not configured. Set --dart-define=API_BASE_URL=https://your-api-host.example',
      );
    }
    final body = _checkoutRequestBody(
      amountCents: amountCents,
      senderCountry: senderCountry,
      currency: currency,
      operatorKey: operatorKey,
      recipientPhone: recipientPhone,
      packageId: packageId,
      billingJurisdiction: billingJurisdiction,
    );

    // Use [api.baseUrl] (same host as the POST), not [AppConfig.apiBaseUrl], so logs match
    // the request when main() supplies a debug default without dart-define.
    final fullUrl = '${api.baseUrl}/api/checkout-pricing-quote';
    if (!kReleaseMode) {
      debugPrint('[PaymentService] pricing quote: $fullUrl');
    }

    http.Response response;
    try {
      response = await api
          .postCheckoutPricingQuotePublic(body)
          .timeout(_pricingQuoteApiTimeout);
    } catch (e) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] pricing quote request failed: $e');
      }
      return null;
    }

    if (response.statusCode == 400) {
      if (!kReleaseMode) {
        debugPrint(
          '[PaymentService] pricing quote HTTP 400: ${response.body}',
        );
      }
      return null;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (!kReleaseMode) {
        debugPrint(
          '[PaymentService] pricing quote HTTP ${response.statusCode}: ${response.body}',
        );
      }
      return null;
    }

    try {
      final data = jsonDecode(response.body);
      if (data is! Map) return null;
      final q = CheckoutPricingQuoteResponse.tryParseMap(
        Map<String, dynamic>.from(data),
      );
      if (q != null && q.breakdown != null && !kReleaseMode) {
        final b = q.breakdown!;
        debugPrint(
          '[PaymentService] quote breakdown: product=${b.productValueUsd} tax=${b.taxUsd} fee=${b.serviceFeeUsd} total=${b.totalUsd}',
        );
      }
      return q;
    } catch (e) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] pricing quote parse failed: $e');
      }
      return null;
    }
  }

  /// When [packageId] is set, [amountCents] is not sent; the server prices from catalog only.
  /// Returns [CheckoutPricingBreakdown] from the JSON body when present (same as quote).
  Future<CheckoutPricingBreakdown?> startCheckout({
    required int amountCents,
    required String senderCountry,
    String currency = 'usd',
    String? operatorKey,
    String? recipientPhone,
    String? packageId,
    Map<String, dynamic>? billingJurisdiction,
  }) async {
    if (api.baseUrl.isEmpty) {
      throw StateError(
        'API base URL is not configured. Set --dart-define=API_BASE_URL=https://your-api-host.example',
      );
    }
    final idempotencyKey = const Uuid().v4();

    final body = _checkoutRequestBody(
      amountCents: amountCents,
      senderCountry: senderCountry,
      currency: currency,
      operatorKey: operatorKey,
      recipientPhone: recipientPhone,
      packageId: packageId,
      billingJurisdiction: billingJurisdiction,
    );

    if (!kReleaseMode) {
      debugPrint('CHECKOUT_REQUEST ${const JsonEncoder.withIndent('  ').convert(body)}');
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
            ? 'Checkout could not be started. Please try again.'
            : 'Checkout could not be started. Please try again.\n'
                'Timeout after ${_checkoutApiTimeout.inSeconds}s — check the API at ${AppConfig.apiBaseUrl}.',
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
      debugPrint(
        'CHECKOUT_RESPONSE status=${response.statusCode} body=${response.body.length > 800 ? '${response.body.substring(0, 800)}…' : response.body}',
      );
      debugPrint('[PaymentService] HTTP ${response.statusCode}');
    }

    if (response.statusCode == 503) {
      try {
        final m = jsonDecode(response.body);
        if (m is Map && m['code'] == 'payments_lockdown') {
          throw const PaymentsLockdownException(
            'Payments are temporarily locked for security testing.',
          );
        }
      } on FormatException {
        /* fall through */
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (!kReleaseMode) {
        debugPrint('[PaymentService] error status ${response.statusCode}');
      }
      throw StateError(
        kReleaseMode
            ? 'Checkout could not be started. Please try again.'
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

    CheckoutPricingBreakdown? breakdown;
    final pb = data['pricingBreakdown'];
    if (pb is Map) {
      breakdown = CheckoutPricingBreakdown.fromJson(
        Map<String, dynamic>.from(pb),
      );
    }

    final checkoutUri = Uri.parse(data['url'] as String);
    // `location.assign` on web may never complete the Future; fire-and-forget so UI is not stuck.
    unawaited(openStripeCheckoutPage(checkoutUri));
    return breakdown;
  }
}
