import 'dart:convert';

import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;
import 'package:http/http.dart' as http;

import '../core/config/app_config.dart';

class AuthTokenPair {
  AuthTokenPair({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;
}

/// `/auth/*` endpoints (no Bearer on login/register/refresh body-only).
class AuthApiService {
  AuthApiService({
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
    if (t.isEmpty) return AppConfig.apiBaseUrl;
    return t.replaceAll(RegExp(r'/+$'), '');
  }

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  static String _readError(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['error'] != null) {
        return decoded['error'].toString();
      }
    } catch (_) {}
    return res.body.isNotEmpty ? res.body : 'Request failed';
  }

  Future<AuthTokenPair> register({
    required String email,
    required String password,
  }) async {
    final res = await client.post(
      _u('/auth/register'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (kDebugMode) {
        debugPrint(
          'auth POST ${_u('/auth/register')} → HTTP ${res.statusCode} (base=$baseUrl)',
        );
      }
      throw StateError(_readError(res));
    }
    return _parseTokenPair(res.body);
  }

  Future<AuthTokenPair> login({
    required String email,
    required String password,
  }) async {
    final res = await client.post(
      _u('/auth/login'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (kDebugMode) {
        debugPrint(
          'auth POST ${_u('/auth/login')} → HTTP ${res.statusCode} (base=$baseUrl)',
        );
      }
      throw StateError(_readError(res));
    }
    return _parseTokenPair(res.body);
  }

  Future<AuthTokenPair> refresh({required String refreshToken}) async {
    final res = await client.post(
      _u('/auth/refresh'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw StateError(_readError(res));
    }
    return _parseTokenPair(res.body);
  }

  Future<void> logout({required String refreshToken}) async {
    await client.post(
      _u('/auth/logout'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );
  }

  AuthTokenPair _parseTokenPair(String body) {
    final map = jsonDecode(body) as Map<String, dynamic>;
    final access = map['accessToken'] as String?;
    final refresh = map['refreshToken'] as String?;
    if (access == null ||
        access.isEmpty ||
        refresh == null ||
        refresh.isEmpty) {
      throw StateError('Invalid auth response');
    }
    return AuthTokenPair(accessToken: access, refreshToken: refresh);
  }
}
