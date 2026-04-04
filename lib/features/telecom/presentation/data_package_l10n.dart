import '../../../l10n/app_localizations.dart';
import '../domain/data_package_offer.dart';

extension DataPackageOfferL10n on DataPackageOffer {
  String localizedDataLabel(AppLocalizations l10n) {
    if (dataGb >= 1) {
      final n = dataGb == dataGb.roundToDouble()
          ? dataGb.toStringAsFixed(0)
          : dataGb.toStringAsFixed(1);
      return l10n.dataVolumeGb(n);
    }
    final mb = (dataGb * 1024).round();
    return l10n.dataVolumeMb('$mb');
  }

  String localizedValidity(AppLocalizations l10n) {
    if (validityDays == 1) return l10n.validityOneDay;
    if (validityDays == 7) return l10n.validity7Days;
    if (validityDays == 30) return l10n.validity30Days;
    return l10n.validityNDays('$validityDays');
  }
}
