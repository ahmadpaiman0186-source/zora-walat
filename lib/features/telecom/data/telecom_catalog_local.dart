import '../domain/airtime_offer.dart';
import '../domain/data_package_offer.dart';
import '../domain/data_package_period.dart';
import '../domain/mobile_operator.dart';
import '../domain/product_tier.dart';

/// Local product matrix. Replace with [TelecomService] HTTP responses in production.
abstract final class TelecomCatalogLocal {
  static List<AirtimeOffer> airtimeFor(MobileOperator op) {
    // Phase 1: must match server `AIRTIME_SKUS` (GET /catalog/airtime).
    const specs = <(int, int)>[
      (2, 200),
      (3, 300),
      (5, 500),
      (7, 700),
      (9, 900),
      (11, 1100),
      (13, 1300),
      (15, 1500),
      (20, 2000),
      (25, 2500),
    ];
    return specs
        .map(
          (s) => AirtimeOffer(
            id: '${op.apiKey}_usd_${s.$2}',
            operator: op,
            minutes: s.$1,
            retailUsdCents: s.$2,
          ),
        )
        .toList();
  }

  static List<DataPackageOffer> dataFor(MobileOperator op) {
    final raw = _dataRows(op);
    return _markBestValuePerPeriod(raw);
  }

  static List<DataPackageOffer> _dataRows(MobileOperator op) {
    // Base costs simulate wholesale; margins applied via tier (daily=small, weekly=medium, monthly=large).
    return [
      DataPackageOffer(
        id: '${op.apiKey}_d250',
        operator: op,
        dataGb: 0.25,
        validityDays: 1,
        period: DataPackagePeriod.daily,
        baseCostUsdCents: 42,
        tier: ProductTier.small,
      ),
      DataPackageOffer(
        id: '${op.apiKey}_d1',
        operator: op,
        dataGb: 1,
        validityDays: 1,
        period: DataPackagePeriod.daily,
        baseCostUsdCents: 139,
        tier: ProductTier.small,
      ),
      DataPackageOffer(
        id: '${op.apiKey}_w3',
        operator: op,
        dataGb: 3,
        validityDays: 7,
        period: DataPackagePeriod.weekly,
        baseCostUsdCents: 418,
        tier: ProductTier.medium,
      ),
      DataPackageOffer(
        id: '${op.apiKey}_w8',
        operator: op,
        dataGb: 8,
        validityDays: 7,
        period: DataPackagePeriod.weekly,
        baseCostUsdCents: 989,
        tier: ProductTier.medium,
      ),
      DataPackageOffer(
        id: '${op.apiKey}_m12',
        operator: op,
        dataGb: 12,
        validityDays: 30,
        period: DataPackagePeriod.monthly,
        baseCostUsdCents: 1488,
        tier: ProductTier.large,
      ),
      DataPackageOffer(
        id: '${op.apiKey}_m35',
        operator: op,
        dataGb: 35,
        validityDays: 30,
        period: DataPackagePeriod.monthly,
        baseCostUsdCents: 3990,
        tier: ProductTier.large,
      ),
    ];
  }

  static List<DataPackageOffer> _markBestValuePerPeriod(
    List<DataPackageOffer> rows,
  ) {
    final byPeriod = <DataPackagePeriod, List<DataPackageOffer>>{};
    for (final p in DataPackagePeriod.values) {
      byPeriod[p] = rows.where((e) => e.period == p).toList();
    }
    final updated = <DataPackageOffer>[];
    for (final p in DataPackagePeriod.values) {
      final list = byPeriod[p]!;
      if (list.isEmpty) continue;
      var bestIdx = 0;
      var bestScore = -1.0;
      for (var i = 0; i < list.length; i++) {
        final cents = list[i].finalUsdCents;
        if (cents <= 0) continue;
        final score = list[i].dataGb / (cents / 100.0);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      for (var i = 0; i < list.length; i++) {
        updated.add(DataPackageOffer(
          id: list[i].id,
          operator: list[i].operator,
          dataGb: list[i].dataGb,
          validityDays: list[i].validityDays,
          period: list[i].period,
          baseCostUsdCents: list[i].baseCostUsdCents,
          tier: list[i].tier,
          isBestValue: i == bestIdx,
        ));
      }
    }
    updated.sort((a, b) {
      final pc = a.period.index.compareTo(b.period.index);
      if (pc != 0) return pc;
      return a.finalUsdCents.compareTo(b.finalUsdCents);
    });
    return updated;
  }
}
