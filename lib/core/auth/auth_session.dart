import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kAccess = 'zw_access_token';
const _kRefresh = 'zw_refresh_token';

/// Persists JWT access/refresh for API calls. Never log token values.
class AuthSession extends ChangeNotifier {
  AuthSession(this._prefs);

  final SharedPreferences _prefs;

  String? _access;
  String? _refresh;

  Future<void> restore() async {
    _access = _prefs.getString(_kAccess);
    _refresh = _prefs.getString(_kRefresh);
    notifyListeners();
  }

  bool get isAuthenticated =>
      (_access != null && _access!.trim().isNotEmpty);

  String? get accessToken => _access;

  String? get refreshToken => _refresh;

  Future<void> setTokens({
    required String access,
    required String refresh,
  }) async {
    _access = access;
    _refresh = refresh;
    await _prefs.setString(_kAccess, access);
    await _prefs.setString(_kRefresh, refresh);
    notifyListeners();
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    await _prefs.remove(_kAccess);
    await _prefs.remove(_kRefresh);
    notifyListeners();
  }
}
