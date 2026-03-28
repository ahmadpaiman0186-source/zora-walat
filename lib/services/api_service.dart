import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/config/app_config.dart';
import '../models/recharge_package.dart';
import '../models/wallet_balance.dart';

/// Default API host for Zora-Walat MVP (no trailing slash).
const String kDefaultApiBaseUrl = 'http://localhost:3000';

/// HTTP client for the Node API (`/api/wallet`, `/api/recharge`, `/api/payment`).
class ApiService {
  ApiService({
    required this.client,
    String? baseUrl,
  }) : baseUrl = _normalizeBase(
          (baseUrl == null || baseUrl.trim().isEmpty)
              ? AppConfig.apiBaseUrl
              : baseUrl,
        );

  final http.Client client;
  final String baseUrl;

  static String _normalizeBase(String raw) {
    final t = raw.trim();
    if (t.isEmpty) return kDefaultApiBaseUrl;
    return t.replaceAll(RegExp(r'/+$'), '');
  }

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Map<String, String> get _jsonHeaders => {
        'Content-Type': 'application/json',
        ..._authHeaders,
      };

  Map<String, String> get _authHeaders =>
      {if (AppConfig.bffApiKey.isNotEmpty) 'X-Api-Key': AppConfig.bffApiKey};

  static String _httpErrorMessage(String prefix, http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['error'] != null) {
        return '$prefix ${res.statusCode}: ${decoded['error']}';
      }
    } catch (_) {
      /* use raw body below */
    }
    final body = res.body.isNotEmpty ? res.body : '(empty body)';
    return '$prefix ${res.statusCode}: $body';
  }

  Future<WalletBalance> getBalance() async {
    final res = await client.get(_u('/api/wallet/balance'), headers: _authHeaders);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Balance', res));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    return WalletBalance.fromJson(map);
  }

  Future<WalletBalance> topup(double amountUsd) async {
    final res = await client.post(
      _u('/api/wallet/topup'),
      headers: _jsonHeaders,
      body: jsonEncode({'amount': amountUsd}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Topup', res));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    return WalletBalance(
      balance: (map['balance'] as num).toDouble(),
      currency: map['currency'] as String? ?? 'USD',
    );
  }

  /// Alias for [topup] — `POST /api/wallet/topup` with `{ amount }`.
  Future<WalletBalance> topUpWallet(double amount) => topup(amount);

  /// Loads packages from `POST /api/recharge/quote` (live backend on port 3000 by default).
  Future<List<RechargePackage>> getRechargePackages(String phone, String operator) async {
    final res = await client.post(
      _u('/api/recharge/quote'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'phone': phone,
        'operator': operator,
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Packages', res));
    }
    try {
      final map = jsonDecode(res.body) as Map<String, dynamic>;
      final list = map['packages'] as List<dynamic>? ?? [];
      return list
          .map(
            (e) => RechargePackage.fromJson(
              Map<String, dynamic>.from(e as Map),
            ),
          )
          .toList();
    } on FormatException catch (e) {
      throw StateError('Invalid JSON from server: $e');
    }
  }

  /// Same as [getRechargePackages] — kept for older call sites.
  Future<List<RechargePackage>> getRechargeQuote({
    required String phone,
    required String operator,
  }) =>
      getRechargePackages(phone, operator);

  Future<Map<String, dynamic>> createRechargeOrder({
    required String phone,
    required String operator,
    required String packageId,
  }) async {
    final res = await client.post(
      _u('/api/recharge/order'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'phone': phone,
        'operator': operator,
        'packageId': packageId,
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Order', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> preparePayment({
    double? amountUsd,
    String? orderId,
  }) async {
    final res = await client.post(
      _u('/api/payment/prepare'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'amountUsd': ?amountUsd,
        'orderId': ?orderId,
      }),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Payment prepare', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
