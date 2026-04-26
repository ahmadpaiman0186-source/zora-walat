import '../../l10n/app_localizations.dart';
import 'afghan_phone_utils.dart';

/// Receiving country for mobile top-up UI (dial prefix + ISO context).
class ReceivingCountry {
  const ReceivingCountry({
    required this.isoCode,
    required this.englishName,
    required this.dialCode,
  });

  /// ISO 3166-1 alpha-2 (e.g. AF, US).
  final String isoCode;

  /// Stable English label for dropdowns (matches [kReceivingCountries] keys).
  final String englishName;

  /// E.164 country calling code, e.g. `+93`, `+1`.
  final String dialCode;

  /// Digits only of [dialCode], e.g. `93`, `1`.
  String get dialDigits => dialCode.replaceAll(RegExp(r'\D'), '');
}

/// Supported receiving countries for the recharge home screen (dial prefix UX).
/// Backend recharge APIs currently accept **Afghanistan mobile** only; other rows are UI-ready.
const List<ReceivingCountry> kReceivingCountriesForRecharge = [
  ReceivingCountry(isoCode: 'AF', englishName: 'Afghanistan', dialCode: '+93'),
  ReceivingCountry(isoCode: 'US', englishName: 'United States', dialCode: '+1'),
  ReceivingCountry(isoCode: 'GB', englishName: 'United Kingdom', dialCode: '+44'),
  ReceivingCountry(isoCode: 'AE', englishName: 'United Arab Emirates', dialCode: '+971'),
  ReceivingCountry(isoCode: 'CA', englishName: 'Canada', dialCode: '+1'),
  ReceivingCountry(isoCode: 'DE', englishName: 'Germany', dialCode: '+49'),
];

ReceivingCountry receivingCountryByIso(String iso) {
  for (final c in kReceivingCountriesForRecharge) {
    if (c.isoCode == iso) return c;
  }
  return kReceivingCountriesForRecharge.first;
}

abstract final class RechargePhoneComposer {
  static String digitsOnly(String input) =>
      input.replaceAll(RegExp(r'\D'), '');

  /// Full value to send on [RechargeDraft.phoneE164Style] and API `phone` fields.
  /// For Afghanistan, keeps compatibility with [AfghanPhoneUtils] / server `normalizeAfghanNational`.
  static String phonePayloadForApi({
    required ReceivingCountry country,
    required String localRaw,
  }) {
    final t = localRaw.trim();
    if (t.isEmpty) return '';

    if (country.isoCode == 'AF') {
      return t;
    }

    final d = digitsOnly(t);
    return '+${country.dialDigits}$d';
  }

  /// Validation for the **local** field (prefix excluded). Null = valid.
  static String? validateLocal(
    AppLocalizations l10n,
    ReceivingCountry country,
    String? localRaw,
  ) {
    if (localRaw == null || localRaw.trim().isEmpty) {
      return l10n.phoneValidationEmpty;
    }

    if (country.isoCode == 'AF') {
      return AfghanPhoneUtils.validationErrorL10n(l10n, localRaw.trim());
    }

    final d = digitsOnly(localRaw);
    if (country.dialDigits == '1' && (country.isoCode == 'US' || country.isoCode == 'CA')) {
      if (d.length != 10) {
        return l10n.phoneValidationLength;
      }
      return null;
    }

    if (d.length < 6 || d.length > 15) {
      return l10n.phoneValidationInvalid;
    }
    return null;
  }

  /// Review-line display (prefix + spaced local).
  static String displayPretty({
    required ReceivingCountry country,
    required String localRaw,
  }) {
    final t = localRaw.trim();
    if (t.isEmpty) return country.dialCode;

    if (country.isoCode == 'AF') {
      return AfghanPhoneUtils.displayInternational(t);
    }

    final d = digitsOnly(t);
    return '${country.dialCode} $d';
  }
}
