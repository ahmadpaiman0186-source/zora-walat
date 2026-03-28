import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kLocaleCode = 'zw_app_locale_code';

/// Persists and notifies when the user selects English, Dari (`fa`), or Pashto (`ps`).
///
/// Dari uses the `fa` [Locale] (Persian script), which is standard for Flutter
/// typography and RTL layout for Afghanistan Persian/Dari.
class LocaleController extends ChangeNotifier {
  LocaleController(this._prefs) {
    _locale = _readInitialLocale();
  }

  final SharedPreferences _prefs;

  late Locale _locale;

  Locale get locale => _locale;

  Locale _readInitialLocale() {
    final saved = _prefs.getString(_kLocaleCode);
    if (saved == 'en' || saved == 'fa' || saved == 'ps') {
      return Locale(saved!);
    }
    final device = WidgetsBinding.instance.platformDispatcher.locale;
    final code = device.languageCode;
    if (code == 'fa' || code == 'ps') {
      return Locale(code);
    }
    return const Locale('en');
  }

  Future<void> setLocale(Locale value) async {
    final code = value.languageCode;
    if (code != 'en' && code != 'fa' && code != 'ps') {
      return;
    }
    _locale = Locale(code);
    await _prefs.setString(_kLocaleCode, code);
    notifyListeners();
  }
}
