import 'package:flutter_test/flutter_test.dart';
import 'package:zora_walat/models/checkout_pricing_breakdown.dart';

void main() {
  group('CheckoutPricingBreakdown.fromJson', () {
    test('prefers USD when cent field is present but zero and USD is non-zero', () {
      final b = CheckoutPricingBreakdown.fromJson({
        'productValueUsdCents': 500,
        'productValueUsd': 5.0,
        'governmentTaxUsdCents': 0,
        'taxUsd': 0.0,
        'zoraServiceFeeUsdCents': 0,
        'serviceFeeUsd': 0.15,
        'totalUsdCents': 515,
        'totalUsd': 5.15,
      });
      expect(b.productValueUsdCents, 500);
      expect(b.governmentTaxUsdCents, 0);
      expect(b.zoraServiceFeeUsdCents, 15);
      expect(b.totalUsdCents, 515);
    });

    test('reconciles total when totalUsdCents matches face value but fee is in USD only', () {
      final b = CheckoutPricingBreakdown.fromJson({
        'productValueUsdCents': 500,
        'productValueUsd': 5.0,
        'governmentTaxUsdCents': 0,
        'taxUsd': 0.0,
        'zoraServiceFeeUsdCents': 0,
        'serviceFeeUsd': 0.15,
        'totalUsdCents': 500,
        'totalUsd': 5.15,
      });
      expect(b.zoraServiceFeeUsdCents, 15);
      expect(b.totalUsdCents, 515);
    });
  });
}
