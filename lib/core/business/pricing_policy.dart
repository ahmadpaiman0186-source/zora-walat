/// Hook for future retail vs. cost vs. commission logic (server remains source of truth for charged amounts).
abstract final class PricingPolicy {
  /// Placeholder: commission on successful fulfillment (basis points or fixed — TBD).
  static int commissionCentsForOrder(int retailUsdCents) => 0;
}
