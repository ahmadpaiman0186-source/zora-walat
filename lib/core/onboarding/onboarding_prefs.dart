import 'package:shared_preferences/shared_preferences.dart';

const _kLanguageOnboardingComplete = 'zw_language_onboarding_complete';

/// First-run language step; splash uses this to skip `/language` when done.
class OnboardingPrefs {
  OnboardingPrefs(this._prefs);

  final SharedPreferences _prefs;

  bool get hasCompletedLanguageOnboarding =>
      _prefs.getBool(_kLanguageOnboardingComplete) ?? false;

  Future<void> markLanguageOnboardingComplete() =>
      _prefs.setBool(_kLanguageOnboardingComplete, true);
}
