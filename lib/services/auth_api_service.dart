import 'dart:convert';

import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;
import 'package:http/http.dart' as http;

import '../core/config/app_config.dart';

class AuthTokenPair {
  AuthTokenPair({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn,
    this.tokenType,
    this.user,
  });

  final String accessToken;
  final String refreshToken;
  final int? expiresIn;
  final String? tokenType;
  final AuthApiUser? user;
}

class AuthApiUser {
  AuthApiUser({
    required this.id,
    required this.email,
    required this.role,
  });

  factory AuthApiUser.fromJson(Map<String, dynamic> json) {
    return AuthApiUser(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? '',
    );
  }

  final String id;
  final String email;
  final String role;
}

class OtpRequestResult {
  OtpRequestResult({
    required this.ok,
    required this.message,
  });

  final bool ok;
  final String message;
}

class AuthApiException implements Exception {
  AuthApiException({
    required this.message,
    this.statusCode,
    this.errorCode,
    this.isNetworkError = false,
  });

  final String message;
  final int? statusCode;
  final String? errorCode;
  final bool isNetworkError;

  @override
  String toString() => message;
}

/// `/api/auth/*` endpoints (no Bearer on login/register/refresh body-only).
/// [baseUrl] is the API host root (e.g. `https://api.example.com`), not `/api` alone.
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

  static const String _authPrefix = '/api/auth';

  /// Parses Node [HttpError] JSON: `{ success: false, message, code }`.
  /// Falls back to legacy `{ error }` when `message` is absent.
  static ({String message, String? code}) _readErrorPayload(http.Response res) {
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map) {
        final raw =
            decoded['message'] ?? decoded['error'];
        if (raw != null) {
          return (
            message: raw.toString(),
            code: decoded['code']?.toString(),
          );
        }
      }
    } catch (_) {}
    return (
      message: res.body.isNotEmpty ? res.body : 'Request failed',
      code: null,
    );
  }

  AuthApiException _networkError(Object error) {
    return AuthApiException(
      message: 'Network error. Check your connection and try again.',
      isNetworkError: true,
    );
  }

  Future<AuthTokenPair> register({
    required String email,
    required String password,
  }) async {
    _requireConfiguredBaseUrl();
    final res = await client.post(
      _u('$_authPrefix/register'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final error = _readErrorPayload(res);
      if (kDebugMode) {
        debugPrint(
          'auth POST ${_u('$_authPrefix/register')} → HTTP ${res.statusCode} (base=$baseUrl)',
        );
      }
      throw AuthApiException(
        message: error.message,
        statusCode: res.statusCode,
        errorCode: error.code,
      );
    }
    return _parseTokenPair(res.body);
  }

  Future<AuthTokenPair> login({
    required String email,
    required String password,
  }) async {
    _requireConfiguredBaseUrl();
    final res = await client.post(
      _u('$_authPrefix/login'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final error = _readErrorPayload(res);
      if (kDebugMode) {
        debugPrint(
          'auth POST ${_u('$_authPrefix/login')} → HTTP ${res.statusCode} (base=$baseUrl)',
        );
      }
      throw AuthApiException(
        message: error.message,
        statusCode: res.statusCode,
        errorCode: error.code,
      );
    }
    return _parseTokenPair(res.body);
  }

  Future<AuthTokenPair> refresh({required String refreshToken}) async {
    _requireConfiguredBaseUrl();
    final res = await client.post(
      _u('$_authPrefix/refresh'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final error = _readErrorPayload(res);
      throw AuthApiException(
        message: error.message,
        statusCode: res.statusCode,
        errorCode: error.code,
      );
    }
    return _parseTokenPair(res.body);
  }

  Future<void> logout({required String refreshToken}) async {
    _requireConfiguredBaseUrl();
    await client.post(
      _u('$_authPrefix/logout'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );
  }

  Future<OtpRequestResult> requestOtp({required String email}) async {
    _requireConfiguredBaseUrl();
    http.Response res;
    try {
      res = await client.post(
        _u('$_authPrefix/request-otp'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
    } on Exception catch (error) {
      throw _networkError(error);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final error = _readErrorPayload(res);
      throw AuthApiException(
        message: error.message,
        statusCode: res.statusCode,
        errorCode: error.code,
      );
    }
    final map = jsonDecode(res.body) as Map<String, dynamic>;
    return OtpRequestResult(
      ok: map['ok'] == true,
      message:
          map['message'] as String? ??
          'If the account is eligible, an OTP email will be sent.',
    );
  }

  Future<AuthTokenPair> verifyOtp({
    required String email,
    required String otp,
  }) async {
    _requireConfiguredBaseUrl();
    http.Response res;
    try {
      res = await client.post(
        _u('$_authPrefix/verify-otp'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp}),
      );
    } on Exception catch (error) {
      throw _networkError(error);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final error = _readErrorPayload(res);
      throw AuthApiException(
        message: error.message,
        statusCode: res.statusCode,
        errorCode: error.code,
      );
    }
    return _parseTokenPair(res.body);
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
    final userMap = map['user'];
    return AuthTokenPair(
      accessToken: access,
      refreshToken: refresh,
      expiresIn: map['expiresIn'] as int?,
      tokenType: map['tokenType'] as String?,
      user: userMap is Map<String, dynamic>
          ? AuthApiUser.fromJson(userMap)
          : userMap is Map
          ? AuthApiUser.fromJson(Map<String, dynamic>.from(userMap))
          : null,
    );
  }
}
