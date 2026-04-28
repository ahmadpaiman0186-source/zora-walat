import 'checkout_pricing_breakdown.dart';

/// Response from `POST /api/checkout-pricing-quote` (and session response may embed same shape).
class CheckoutPricingQuoteResponse {
  const CheckoutPricingQuoteResponse({
    this.breakdown,
    this.pricingMeta,
  });

  final CheckoutPricingBreakdown? breakdown;
  final Map<String, dynamic>? pricingMeta;

  static CheckoutPricingQuoteResponse? tryParseMap(Map<String, dynamic> m) {
    final pb = m['pricingBreakdown'];
    CheckoutPricingBreakdown? b;
    if (pb is Map) {
      b = CheckoutPricingBreakdown.fromJson(
        Map<String, dynamic>.from(pb),
      );
    }
    final meta = m['pricingMeta'];
    return CheckoutPricingQuoteResponse(
      breakdown: b,
      pricingMeta: meta is Map ? Map<String, dynamic>.from(meta) : null,
    );
  }
}
