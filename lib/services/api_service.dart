import 'dart:convert';

import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:http/http.dart' as http;

import '../core/auth/auth_session.dart';
import '../core/auth/unauthorized_exception.dart';
import '../core/config/app_config.dart';
import '../models/recharge_package.dart';
import '../models/wallet_balance.dart';
import 'auth_api_service.dart';

const String _kBffApiKey = String.fromEnvironment(
  'BFF_API_KEY',
  defaultValue: '',
);

/// HTTP client for the Node API (`/api/wallet`, `/api/recharge`, authenticated checkout).
class ApiService {
  ApiService({
    required this.client,
    String? baseUrl,
    AuthSession? authSession,
    AuthApiService? authApi,
  })  : _session = authSession,
        _authApi = authApi,
        baseUrl = _normalizeBase(
          (baseUrl == null || baseUrl.trim().isEmpty)
              ? AppConfig.apiBaseUrl
              : baseUrl,
        );

  final http.Client client;
  final String baseUrl;
  final AuthSession? _session;
  final AuthApiService? _authApi;

  static String _normalizeBase(String raw) {
    final t = raw.trim();
    if (t.isEmpty) return AppConfig.apiBaseUrl;
    return t.replaceAll(RegExp(r'/+$'), '');
  }

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Map<String, String> get _extraHeaders =>
      {if (_kBffApiKey.isNotEmpty) 'X-Api-Key': _kBffApiKey};

  Map<String, String> _jsonHeadersBearer(String? bearer) => {
        'Content-Type': 'application/json',
        ..._extraHeaders,
        if (bearer != null && bearer.isNotEmpty)
          'Authorization': 'Bearer $bearer',
      };

  Map<String, String> _getHeadersBearer(String? bearer) => {
        ..._extraHeaders,
        if (bearer != null && bearer.isNotEmpty)
          'Authorization': 'Bearer $bearer',
      };

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

  Future<String> _requireAccessToken() async {
    final t = _session?.accessToken;
    if (t != null && t.trim().isNotEmpty) return t.trim();
    throw UnauthorizedException();
  }

  Future<bool> _tryRefreshAuth() async {
    final session = _session;
    final api = _authApi;
    final rt = session?.refreshToken;
    if (rt == null || rt.isEmpty || api == null || session == null) {
      return false;
    }
    try {
      final pair = await api.refresh(refreshToken: rt);
      await session.setTokens(
        access: pair.accessToken,
        refresh: pair.refreshToken,
      );
      return true;
    } catch (_) {
      await session.clear();
      return false;
    }
  }

  Future<http.Response> _getAuthed(String path) async {
    var token = await _requireAccessToken();
    var res = await client.get(
      _u(path),
      headers: _getHeadersBearer(token),
    );
    if (res.statusCode == 401 && await _tryRefreshAuth()) {
      token = await _requireAccessToken();
      res = await client.get(
        _u(path),
        headers: _getHeadersBearer(token),
      );
    }
    if (res.statusCode == 401) {
      await _session?.clear();
      throw UnauthorizedException();
    }
    return res;
  }

  Future<http.Response> _postAuthed(String path, Object body) async {
    var token = await _requireAccessToken();
    var res = await client.post(
      _u(path),
      headers: _jsonHeadersBearer(token),
      body: jsonEncode(body),
    );
    if (res.statusCode == 401 && await _tryRefreshAuth()) {
      token = await _requireAccessToken();
      res = await client.post(
        _u(path),
        headers: _jsonHeadersBearer(token),
        body: jsonEncode(body),
      );
    }
    if (res.statusCode == 401) {
      await _session?.clear();
      throw UnauthorizedException();
    }
    return res;
  }

  /// Used by [PaymentService] for `POST /create-checkout-session` with extra headers.
  Future<http.Response> postAuthedWithExtraHeaders(
    String path, {
    required Map<String, dynamic> body,
    Map<String, String> extraHeaders = const {},
  }) async {
    var token = await _requireAccessToken();
    var headers = {
      ..._jsonHeadersBearer(token),
      ...extraHeaders,
    };
    var res = await client.post(
      _u(path),
      headers: headers,
      body: jsonEncode(body),
    );
    if (res.statusCode == 401 && await _tryRefreshAuth()) {
      token = await _requireAccessToken();
      headers = {
        ..._jsonHeadersBearer(token),
        ...extraHeaders,
      };
      res = await client.post(
        _u(path),
        headers: headers,
        body: jsonEncode(body),
      );
    }
    if (res.statusCode == 401) {
      await _session?.clear();
      throw UnauthorizedException();
    }
    return res;
  }

  /// TEMP TEST MODE - remove before production. Matches server `DEV_CHECKOUT_BYPASS_SECRET` (non-release builds).
  Future<http.Response> postCheckoutSessionWithDevBypass(
    String path, {
    required Map<String, dynamic> body,
    required String devSecret,
    Map<String, String> extraHeaders = const {},
  }) async {
    final headers = {
      'Content-Type': 'application/json',
      'X-ZW-Dev-Checkout': devSecret,
      ..._extraHeaders,
      ...extraHeaders,
    };
    return client.post(
      _u(path),
      headers: headers,
      body: jsonEncode(body),
    );
  }

  Future<WalletBalance> getBalance() async {
    final res = await _getAuthed('/api/wallet/balance');
    if (res.statusCode == 403) {
      throw StateError(
        kReleaseMode ? 'Request could not be completed.' : _httpErrorMessage('Balance', res),
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Balance', res));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    return WalletBalance.fromJson(map);
  }

  Future<WalletBalance> topup(double amountUsd) async {
    final res = await _postAuthed('/api/wallet/topup', {'amount': amountUsd});
    if (res.statusCode == 403) {
      throw StateError(
        kReleaseMode ? 'Request could not be completed.' : _httpErrorMessage('Topup', res),
      );
    }
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

  /// Loads packages from `POST /api/recharge/quote`.
  Future<List<RechargePackage>> getRechargePackages(
    String phone,
    String operator,
  ) async {
    final res = await _postAuthed('/api/recharge/quote', {
      'phone': phone,
      'operator': operator,
    });
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
    final res = await _postAuthed('/api/recharge/order', {
      'phone': phone,
      'operator': operator,
      'packageId': packageId,
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Order', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// `POST /api/recharge/execute` — kicks or polls airtime after Stripe Checkout (200 or 409).
  Future<RechargeExecuteResponse> postRechargeExecute(String orderId) async {
    final res = await _postAuthed('/api/recharge/execute', {'orderId': orderId});
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200 && res.statusCode != 409) {
      throw StateError(_httpErrorMessage('Recharge execute', res));
    }
    return RechargeExecuteResponse(statusCode: res.statusCode, json: body);
  }
}

/// Response from [ApiService.postRechargeExecute].
class RechargeExecuteResponse {
  RechargeExecuteResponse({required this.statusCode, required this.json});

  final int statusCode;
  final Map<String, dynamic> json;

  bool get isOk => statusCode == 200;
  bool get isPaymentPending => statusCode == 409;
}
