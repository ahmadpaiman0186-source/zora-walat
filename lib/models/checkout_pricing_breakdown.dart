/// Server-transparent checkout charge: product + sender tax + Zora fee = total.
///
/// Accepts either:
/// - cent fields: `productValueUsdCents`, `governmentTaxUsdCents`, `zoraServiceFeeUsdCents`, `totalUsdCents`
/// - USD fields: `productValueUsd`, `taxUsd`, `serviceFeeUsd`, `totalUsd`
class CheckoutPricingBreakdown {
  const CheckoutPricingBreakdown({
    required this.productValueUsdCents,
    required this.governmentTaxUsdCents,
    required this.zoraServiceFeeUsdCents,
    required this.totalUsdCents,
  });

  final int productValueUsdCents;
  final int governmentTaxUsdCents;
  final int zoraServiceFeeUsdCents;
  final int totalUsdCents;

  /// USD amounts aligned with API `productValueUsd`, `taxUsd`, `serviceFeeUsd`, `totalUsd`.
  double get productValueUsd => productValueUsdCents / 100.0;
  double get taxUsd => governmentTaxUsdCents / 100.0;
  double get serviceFeeUsd => zoraServiceFeeUsdCents / 100.0;
  double get totalUsd => totalUsdCents / 100.0;

  factory CheckoutPricingBreakdown.fromJson(Map<String, dynamic> j) {
    int parseCents(dynamic v) {
      if (v == null) return 0;
      if (v is num) return v.round();
      final n = num.tryParse('$v');
      return n?.round() ?? 0;
    }

    int parseUsdToCents(dynamic v) {
      if (v == null) return 0;
      num? n = v is num ? v : null;
      n ??= num.tryParse('$v');
      if (n == null) return 0;
      return (n * 100).round();
    }

    /// If both cent and USD fields exist but cent is 0 while USD is non-zero, trust USD
    /// (some payloads omit or zero cent fields incorrectly; never drop a non-zero fee/tax.)
    int lineCents({
      required bool hasCentKey,
      required int fromCents,
      required int fromUsd,
    }) {
      if (hasCentKey) {
        if (fromCents == 0 && fromUsd != 0) return fromUsd;
        return fromCents;
      }
      return fromUsd;
    }

    final productCents = lineCents(
      hasCentKey: j.containsKey('productValueUsdCents'),
      fromCents: parseCents(j['productValueUsdCents']),
      fromUsd: parseUsdToCents(j['productValueUsd']),
    );
    final taxCents = lineCents(
      hasCentKey: j.containsKey('governmentTaxUsdCents'),
      fromCents: parseCents(j['governmentTaxUsdCents']),
      fromUsd: parseUsdToCents(j['taxUsd']),
    );
    final feeCents = lineCents(
      hasCentKey: j.containsKey('zoraServiceFeeUsdCents'),
      fromCents: parseCents(j['zoraServiceFeeUsdCents']),
      fromUsd: parseUsdToCents(j['serviceFeeUsd']),
    );
    var totalCents = j.containsKey('totalUsdCents')
        ? parseCents(j['totalUsdCents'])
        : parseUsdToCents(j['totalUsd']);
    final sumLines = productCents + taxCents + feeCents;
    if (totalCents != sumLines) {
      final fromTotalUsd = parseUsdToCents(j['totalUsd']);
      if (fromTotalUsd == sumLines) {
        totalCents = fromTotalUsd;
      } else if ((totalCents - sumLines).abs() <= 1) {
        totalCents = sumLines;
      } else if (sumLines != 0 && (totalCents == 0 || totalCents == productCents)) {
        // Total looked like face-value-only while components include fee/tax.
        totalCents = sumLines;
      }
    }

    return CheckoutPricingBreakdown(
      productValueUsdCents: productCents,
      governmentTaxUsdCents: taxCents,
      zoraServiceFeeUsdCents: feeCents,
      totalUsdCents: totalCents,
    );
  }
}
