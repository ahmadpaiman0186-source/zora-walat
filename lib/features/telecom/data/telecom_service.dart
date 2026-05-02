import '../domain/airtime_offer.dart';
import '../domain/data_package_offer.dart';
import '../domain/mobile_operator.dart';
import 'telecom_catalog_local.dart';

/// Integration boundary for airtime/data providers (Reloadly, Ding, DT One, etc.).
///
/// Implementations should call your BFF or aggregator SDK and map responses to
/// [AirtimeOffer] / [DataPackageOffer]. The placeholder uses an in-memory catalog.
///
/// **Contract:** [fetchAirtimeDenominations] / [fetchDataPackages] must complete with a
/// non-null list (use `[]` when unavailable); callers must not rely on `null`.
abstract class TelecomService {
  const TelecomService();

  Future<List<AirtimeOffer>> fetchAirtimeDenominations(MobileOperator operator);

  Future<List<DataPackageOffer>> fetchDataPackages(MobileOperator operator);

  /// Reserved for quote / eligibility checks before checkout.
  Future<void> prefetchOperatorCatalog(MobileOperator operator) async {}
}

/// Default app implementation until a real API is wired.
class PlaceholderTelecomService extends TelecomService {
  const PlaceholderTelecomService() : super();

  @override
  Future<List<AirtimeOffer>> fetchAirtimeDenominations(
    MobileOperator operator,
  ) async {
    try {
      await Future<void>.delayed(const Duration(milliseconds: 40));
      return TelecomCatalogLocal.airtimeFor(operator);
    } catch (_) {
      return <AirtimeOffer>[];
    }
  }

  @override
  Future<List<DataPackageOffer>> fetchDataPackages(
    MobileOperator operator,
  ) async {
    try {
      await Future<void>.delayed(const Duration(milliseconds: 40));
      return TelecomCatalogLocal.dataFor(operator);
    } catch (_) {
      return <DataPackageOffer>[];
    }
  }
}
