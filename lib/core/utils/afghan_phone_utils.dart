import '../../features/telecom/domain/mobile_operator.dart';
import '../../l10n/app_localizations.dart';

/// Normalizes user input to national mobile digits (leading [7], 9–10 digits).
///
/// Accepts forms such as `070…`, `937…`, spaces, and `+`.
abstract final class AfghanPhoneUtils {
  static String digitsOnly(String input) =>
      input.replaceAll(RegExp(r'\D'), '');

  /// Returns national number (e.g. `701234567`) or null if empty after strip.
  static String? normalizeNational(String input) {
    var d = digitsOnly(input);
    if (d.isEmpty) return null;

    if (d.startsWith('937') && d.length >= 11) {
      return d.substring(3);
    }
    if (d.startsWith('93') && d.length >= 10) {
      final rest = d.substring(2);
      if (rest.startsWith('7')) return rest;
    }
    if (d.startsWith('00937')) {
      d = d.substring(5);
      if (d.startsWith('7')) return d;
    }
    if (d.startsWith('0') && d.length >= 10) {
      return d.substring(1);
    }
    if (d.startsWith('7')) {
      return d;
    }
    return d;
  }

  /// Localized validation for [TextFormField] (null = valid).
  static String? validationErrorL10n(AppLocalizations l10n, String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return l10n.phoneValidationEmpty;
    }
    final n = normalizeNational(raw);
    if (n == null || n.isEmpty) {
      return l10n.phoneValidationInvalid;
    }
    if (n.length < 9 || n.length > 10) {
      return l10n.phoneValidationLength;
    }
    if (!n.startsWith('7')) {
      return l10n.phoneValidationPrefix;
    }
    if (!RegExp(r'^7\d{8,9}$').hasMatch(n)) {
      return l10n.phoneValidationFormat;
    }
    return null;
  }

  /// Display as `+93 7XX XXX XXXX` for review screens (national [7…] digits).
  static String displayInternational(String raw) {
    final n = normalizeNational(raw);
    if (n == null || n.isEmpty) return raw.trim();
    if (n.length == 9) {
      return '+93 ${n.substring(0, 2)} ${n.substring(2, 5)} ${n.substring(5)}';
    }
    if (n.length == 10) {
      return '+93 ${n.substring(0, 2)} ${n.substring(2, 5)} ${n.substring(5, 9)} ${n.substring(9)}';
    }
    return '+93 $n';
  }

  /// Masks middle digits for logs: `70••••4567`.
  static String maskForLog(String nationalDigits) {
    if (nationalDigits.length < 5) return '•••';
    final start = nationalDigits.substring(0, 2);
    final end = nationalDigits.substring(nationalDigits.length - 4);
    return '$start••••$end';
  }

  /// Heuristic prefix map (demo — replace with carrier DB / API lookup in prod).
  static MobileOperator? detectOperator(String nationalDigits) {
    if (nationalDigits.length < 2) return null;
    if (nationalDigits.startsWith('70') ||
        nationalDigits.startsWith('71')) {
      return MobileOperator.afghanWireless;
    }
    if (nationalDigits.startsWith('77') ||
        nationalDigits.startsWith('76')) {
      return MobileOperator.mtn;
    }
    if (nationalDigits.startsWith('78')) {
      return MobileOperator.etisalat;
    }
    if (nationalDigits.startsWith('79')) {
      return MobileOperator.roshan;
    }
    return null;
  }
}
