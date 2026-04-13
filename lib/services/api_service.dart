import 'dart:convert';

import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:uuid/uuid.dart';
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
    String? baseUrlOverride,
    AuthSession? authSession,
    AuthApiService? authApi,
  })  : _session = authSession,
        _authApi = authApi,
        baseUrl = _normalizeBase(
          (baseUrlOverride == null || baseUrlOverride.trim().isEmpty)
              ? AppConfig.apiBaseUrl
              : baseUrlOverride,
        );

  final http.Client client;
  final String baseUrl;
  final AuthSession? _session;
  final AuthApiService? _authApi;

  static String _normalizeBase(String raw) {
    final t = raw.trim();
    if (t.isEmpty) return '';
    return t.replaceAll(RegExp(r'/+$'), '');
  }

  void _requireConfiguredBaseUrl() {
    if (baseUrl.isEmpty) {
      throw StateError(
        'API base URL is not configured. Set --dart-define=API_BASE_URL=https://your-api-host.example',
      );
    }
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

  /// Prefers `{ message, code }` (HttpError); falls back to `{ error }`.
  static String _httpErrorMessage(String prefix, http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map) {
        final text = decoded['message'] ?? decoded['error'];
        if (text != null) {
          final code = decoded['code'];
          final extra = code != null ? ' (code: $code)' : '';
          return '$prefix ${res.statusCode}: $text$extra';
        }
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
    _requireConfiguredBaseUrl();
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
    _requireConfiguredBaseUrl();
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
    _requireConfiguredBaseUrl();
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
    _requireConfiguredBaseUrl();
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

  /// `POST /api/wallet/topup` with fresh UUID v4 per logical top-up attempt.
  ///
  /// When the API has `REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY=true`, missing/invalid header → 400
  /// (`code`: `wallet_topup_idempotency_required` | `wallet_topup_idempotency_invalid`). Same key +
  /// same amount replays safely (`idempotentReplay` in JSON). Same key + different amount → 409
  /// (`code`: `wallet_topup_idempotency_conflict`). Amount above `WALLET_TOPUP_MAX_USD_CENTS` → 400
  /// (`code`: `wallet_topup_amount_out_of_range`). Top-up burst limits → 429 (`wallet_topup_rate_limited`,
  /// `wallet_topup_per_minute_limited`). Rare invariant failure → 500 (`wallet_ledger_invariant_violation`).
  Future<WalletBalance> topup(double amountUsd) async {
    final idem = const Uuid().v4();
    final res = await postAuthedWithExtraHeaders(
      '/api/wallet/topup',
      body: {'amount': amountUsd},
      extraHeaders: {'Idempotency-Key': idem},
    );
    if (res.statusCode == 403) {
      throw StateError(
        kReleaseMode ? 'Request could not be completed.' : _httpErrorMessage('Topup', res),
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Topup', res));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    return WalletBalance.fromJson(map);
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

  /// Recognition tiers (`GET /api/loyalty/tiers`).
  Future<Map<String, dynamic>> getLoyaltyTiers() async {
    final res = await _getAuthed('/api/loyalty/tiers');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Loyalty tiers', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Family / loyalty program (no random rewards; points from completed orders).
  Future<Map<String, dynamic>> getLoyaltySummary() async {
    final res = await _getAuthed('/api/loyalty/summary');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Loyalty summary', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getLoyaltyLeaderboard({
    String? month,
    String scope = 'groups',
    int limit = 15,
  }) async {
    final q = <String, String>{
      'scope': scope,
      'limit': '$limit',
      if (month != null && month.isNotEmpty) 'month': month,
    };
    final uri = _u('/api/loyalty/leaderboard').replace(queryParameters: q);
    var token = await _requireAccessToken();
    var res = await client.get(uri, headers: _getHeadersBearer(token));
    if (res.statusCode == 401 && await _tryRefreshAuth()) {
      token = await _requireAccessToken();
      res = await client.get(uri, headers: _getHeadersBearer(token));
    }
    if (res.statusCode == 401) {
      await _session?.clear();
      throw UnauthorizedException();
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Loyalty leaderboard', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getMyFamilyGroup() async {
    final res = await _getAuthed('/api/loyalty/groups/me');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Family group', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createFamilyGroup(String name) async {
    final res = await _postAuthed('/api/loyalty/groups', {'name': name});
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Create group', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> joinFamilyGroup(String inviteCode) async {
    final res = await _postAuthed('/api/loyalty/groups/join', {
      'inviteCode': inviteCode,
    });
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Join group', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> dissolveFamilyGroup() async {
    final res = await _postAuthed('/api/loyalty/groups/dissolve', {});
    if (res.statusCode != 204 && res.statusCode != 200) {
      throw StateError(_httpErrorMessage('Dissolve group', res));
    }
  }

  Future<void> leaveFamilyGroup() async {
    final res = await _postAuthed('/api/loyalty/groups/leave', {});
    if (res.statusCode != 204 && res.statusCode != 200) {
      throw StateError(_httpErrorMessage('Leave group', res));
    }
  }

  /// Referral center summary (`GET /api/referral/me`).
  Future<Map<String, dynamic>> getReferralMe() async {
    final res = await _getAuthed('/api/referral/me');
    if (res.statusCode == 403) {
      throw StateError(
        kReleaseMode ? 'Request could not be completed.' : _httpErrorMessage('Referral me', res),
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Referral me', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Referral invites as inviter (`GET /api/referral/history`).
  Future<Map<String, dynamic>> getReferralHistory() async {
    final res = await _getAuthed('/api/referral/history');
    if (res.statusCode == 403) {
      throw StateError(
        kReleaseMode ? 'Request could not be completed.' : _httpErrorMessage('Referral history', res),
      );
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Referral history', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Account-linked order history (`GET /api/transactions`).
  Future<List<Map<String, dynamic>>> fetchUserOrders({int limit = 24}) async {
    final lim = limit.clamp(1, 50);
    final res = await _getAuthed('/api/transactions?limit=$lim');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Orders list', res));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    final list = map['orders'] as List<dynamic>? ?? [];
    return list
        .map((e) => Map<String, dynamic>.from(e as Map<dynamic, dynamic>))
        .toList();
  }

  /// `POST /api/notifications/devices` — register FCM token (204 expected).
  Future<void> registerPushDevice({
    required String token,
    required String platform,
  }) async {
    final res = await _postAuthed('/api/notifications/devices', {
      'token': token,
      'platform': platform,
    });
    if (res.statusCode != 204) {
      throw StateError(_httpErrorMessage('Push register', res));
    }
  }

  /// `DELETE /api/notifications/devices` — remove FCM token on sign-out.
  Future<void> unregisterPushDevice(String token) async {
    var t = await _requireAccessToken();
    var res = await client.delete(
      _u('/api/notifications/devices'),
      headers: _jsonHeadersBearer(t),
      body: jsonEncode({'token': token}),
    );
    if (res.statusCode == 401 && await _tryRefreshAuth()) {
      t = await _requireAccessToken();
      res = await client.delete(
        _u('/api/notifications/devices'),
        headers: _jsonHeadersBearer(t),
        body: jsonEncode({'token': token}),
      );
    }
    if (res.statusCode == 401) {
      await _session?.clear();
      throw UnauthorizedException();
    }
    if (res.statusCode != 204) {
      throw StateError(_httpErrorMessage('Push unregister', res));
    }
  }

  /// `GET /api/notifications/inbox` — server inbox for merge (newest first).
  Future<List<Map<String, dynamic>>> fetchNotificationInbox({
    int limit = 40,
  }) async {
    final res = await _getAuthed('/api/notifications/inbox?limit=$limit');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Notification inbox', res));
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    final list = map['items'] as List<dynamic>? ?? [];
    return list
        .map((e) => Map<String, dynamic>.from(e as Map<dynamic, dynamic>))
        .toList();
  }

  /// Single order for receipt / tracking (`GET /api/transactions/:id`).
  Future<Map<String, dynamic>> fetchUserOrder(String orderId) async {
    final id = orderId.trim();
    if (id.isEmpty) {
      throw ArgumentError('orderId empty');
    }
    final enc = Uri.encodeComponent(id);
    final res = await _getAuthed('/api/transactions/$enc');
    if (res.statusCode == 404) {
      throw StateError('Orders detail ${res.statusCode}: not found');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_httpErrorMessage('Orders detail', res));
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
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
