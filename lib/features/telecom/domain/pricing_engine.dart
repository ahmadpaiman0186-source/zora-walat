import 'product_tier.dart';

/// Applies wholesale → retail USD with configurable margins.
abstract final class PricingEngine {
  /// Markup on landed cost (provider + taxes): retail ≥ landed × (1 + this).
  static const double minimumMarginAfterCosts = 0.10;

  static int retailUsdCents(int baseCostUsdCents, ProductTier tier) {
    if (baseCostUsdCents <= 0) return 0;
    final withMargin = baseCostUsdCents * (1.0 + tier.marginRate);
    return withMargin.round();
  }

  /// Upper bound on landed cost (USD cents) so retail still meets at least
  /// [minimumMarginAfterCosts] markup: `retail / (1 + minimumMarginAfterCosts)`.
  static int maxLandedCostUsdCentsForRetail(int retailUsdCents) {
    if (retailUsdCents <= 0) return 0;
    return (retailUsdCents / (1.0 + minimumMarginAfterCosts)).floor();
  }
}
