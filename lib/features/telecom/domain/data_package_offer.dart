import 'package:flutter/foundation.dart';

import 'data_package_period.dart';
import 'mobile_operator.dart';
import 'pricing_engine.dart';
import 'product_tier.dart';

@immutable
class DataPackageOffer {
  const DataPackageOffer({
    required this.id,
    required this.operator,
    required this.dataGb,
    required this.validityDays,
    required this.period,
    required this.baseCostUsdCents,
    required this.tier,
    this.isBestValue = false,
  });

  final String id;
  final MobileOperator operator;
  final double dataGb;
  final int validityDays;
  final DataPackagePeriod period;
  final int baseCostUsdCents;
  final ProductTier tier;
  final bool isBestValue;

  int get finalUsdCents =>
      PricingEngine.retailUsdCents(baseCostUsdCents, tier);

  String get dataLabel {
    if (dataGb >= 1) {
      return '${dataGb == dataGb.roundToDouble() ? dataGb.toStringAsFixed(0) : dataGb.toStringAsFixed(1)} GB';
    }
    final mb = (dataGb * 1024).round();
    return '$mb MB';
  }

  String get validityLabel {
    if (validityDays == 1) return '1 day';
    if (validityDays == 7) return '7 days';
    if (validityDays == 30) return '30 days';
    return '$validityDays days';
  }
}
