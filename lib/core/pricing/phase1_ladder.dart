/// Permanent Phase 1 customer-facing USD ladder (cents). Must match server
/// `PHASE1_LADDER_USD_CENTS` / `AIRTIME_SKUS`.
abstract final class Phase1Ladder {
  static const List<int> usdCents = <int>[
    200,
    300,
    500,
    700,
    900,
    1100,
    1300,
    1500,
    2000,
    2500,
  ];

  /// Snap [rawCents] to the nearest rung (ties: lower amount).
  static int snapUsdCents(int rawCents) {
    if (usdCents.isEmpty) return rawCents;
    var best = usdCents.first;
    var bestD = (rawCents - best).abs();
    for (final c in usdCents) {
      final d = (rawCents - c).abs();
      if (d < bestD || (d == bestD && c < best)) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }
}
