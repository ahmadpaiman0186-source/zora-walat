import 'package:flutter/foundation.dart';

import 'mobile_operator.dart';
import 'pricing_engine.dart';

/// Voice-minute bundle with fixed USD retail and a defined landed-cost ceiling.
@immutable
class AirtimeOffer {
  const AirtimeOffer({
    required this.id,
    required this.operator,
    required this.minutes,
    required this.retailUsdCents,
  });

  final String id;
  final MobileOperator operator;
  final int minutes;

  /// Customer pays this amount (USD cents).
  final int retailUsdCents;

  int get finalUsdCents => retailUsdCents;

  /// Max (provider + tax) in USD cents while keeping ≥10% markup vs retail.
  int get maxLandedCostUsdCents =>
      PricingEngine.maxLandedCostUsdCentsForRetail(retailUsdCents);

  /// Whole-dollar SKUs: show face value (matches server catalog).
  String get labelShort =>
      retailUsdCents % 100 == 0
          ? '\$${retailUsdCents ~/ 100}'
          : '${(retailUsdCents / 100).toStringAsFixed(2)} USD';

  factory AirtimeOffer.fromCatalogJson(
    Map<String, dynamic> json,
    MobileOperator operator,
  ) {
    return AirtimeOffer(
      id: json['id'] as String,
      operator: operator,
      minutes: json['minutes'] as int,
      retailUsdCents: json['retailUsdCents'] as int,
    );
  }
}
