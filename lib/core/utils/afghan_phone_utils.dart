import '../../features/telecom/domain/mobile_operator.dart';

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

  /// Validation suitable for TextFormField (null = valid).
  static String? validationError(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return 'Enter a mobile number';
    }
    final n = normalizeNational(raw);
    if (n == null || n.isEmpty) {
      return 'Use a valid Afghanistan mobile number';
    }
    if (n.length < 9 || n.length > 10) {
      return 'Number should be 9–10 digits (after 7…)';
    }
    if (!n.startsWith('7')) {
      return 'Afghan mobile numbers start with 7';
    }
    if (!RegExp(r'^7\d{8,9}$').hasMatch(n)) {
      return 'Invalid mobile format';
    }
    return null;
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
