/// Margin tier for USD pricing (small / medium / large packages).
enum ProductTier {
  small(0.07),
  medium(0.08),
  large(0.10);

  const ProductTier(this.marginRate);

  /// Profit margin as a fraction (e.g. 0.07 = 7%).
  final double marginRate;
}
