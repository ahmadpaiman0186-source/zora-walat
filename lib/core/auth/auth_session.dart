import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'jwt_payload.dart';

const _kAccess = 'zw_access_token';
const _kRefresh = 'zw_refresh_token';
const _kUserId = 'zw_user_id';
const _kUserEmail = 'zw_user_email';
const _kUserRole = 'zw_user_role';

/// Persists JWT access/refresh for API calls. Never log token values.
class AuthSession extends ChangeNotifier {
  AuthSession(this._prefs);

  final SharedPreferences _prefs;

  String? _access;
  String? _refresh;
  String? _userId;
  String? _userEmail;
  String? _userRole;

  Future<void> restore() async {
    _access = _prefs.getString(_kAccess);
    _refresh = _prefs.getString(_kRefresh);
    _userId = _prefs.getString(_kUserId);
    _userEmail = _prefs.getString(_kUserEmail);
    _userRole = _prefs.getString(_kUserRole);
    final payload = decodeJwtPayload(_access);
    _userId ??= payload?['sub'] as String?;
    _userEmail ??= payload?['email'] as String?;
    _userRole ??= payload?['role'] as String?;
    notifyListeners();
  }

  bool get isAuthenticated =>
      (_access != null && _access!.trim().isNotEmpty);

  String? get accessToken => _access;

  String? get refreshToken => _refresh;

  String? get userId => _userId;

  String? get userEmail => _userEmail;

  String? get userRole => _userRole;

  Future<void> setTokens({
    required String access,
    required String refresh,
    String? userId,
    String? userEmail,
    String? userRole,
  }) async {
    _access = access;
    _refresh = refresh;
    final payload = decodeJwtPayload(access);
    _userId = userId ?? payload?['sub'] as String?;
    _userEmail = userEmail ?? payload?['email'] as String?;
    _userRole = userRole ?? payload?['role'] as String?;
    await _prefs.setString(_kAccess, access);
    await _prefs.setString(_kRefresh, refresh);
    if (_userId != null && _userId!.isNotEmpty) {
      await _prefs.setString(_kUserId, _userId!);
    } else {
      await _prefs.remove(_kUserId);
    }
    if (_userEmail != null && _userEmail!.isNotEmpty) {
      await _prefs.setString(_kUserEmail, _userEmail!);
    } else {
      await _prefs.remove(_kUserEmail);
    }
    if (_userRole != null && _userRole!.isNotEmpty) {
      await _prefs.setString(_kUserRole, _userRole!);
    } else {
      await _prefs.remove(_kUserRole);
    }
    notifyListeners();
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _userId = null;
    _userEmail = null;
    _userRole = null;
    await _prefs.remove(_kAccess);
    await _prefs.remove(_kRefresh);
    await _prefs.remove(_kUserId);
    await _prefs.remove(_kUserEmail);
    await _prefs.remove(_kUserRole);
    notifyListeners();
  }
}
