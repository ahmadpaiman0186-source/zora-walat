class TierInfo {
  TierInfo({
    required this.rankStart,
    required this.rankEnd,
    required this.sortOrder,
    required this.label,
    this.description,
  });

  final int rankStart;
  final int? rankEnd;
  final int sortOrder;
  final String label;
  final String? description;

  bool containsRank(int r) {
    final end = rankEnd ?? 999999;
    return r >= rankStart && r <= end;
  }
}

List<TierInfo> parseTierInfoList(List<dynamic>? raw) {
  if (raw == null) return const [];
  final list = raw.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    final end = m['rankEnd'];
    return TierInfo(
      rankStart: (m['rankStart'] as num?)?.toInt() ?? 1,
      rankEnd: end == null ? null : (end as num).toInt(),
      sortOrder: (m['sortOrder'] as num?)?.toInt() ?? 0,
      label: m['label'] as String? ?? '',
      description: m['description'] as String?,
    );
  }).toList();
  list.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  return list;
}

class NextTierClimb {
  NextTierClimb({required this.ranksToClimb, required this.targetTierLabel});

  final int ranksToClimb;
  final String targetTierLabel;
}

NextTierClimb? computeNextTierClimb(int? monthRank, List<TierInfo> tiers) {
  if (monthRank == null || tiers.isEmpty) return null;
  final idx = tiers.indexWhere((t) => t.containsRank(monthRank));
  if (idx <= 0) return null;
  final better = tiers[idx - 1];
  final boundary = better.rankEnd ?? better.rankStart;
  final need = monthRank - boundary;
  if (need <= 0) return null;
  return NextTierClimb(ranksToClimb: need, targetTierLabel: better.label);
}

/// 1.0 = at the best edge of your current tier band (lower rank is better).
double? tierBandProgressTowardTop(int? monthRank, List<TierInfo> tiers) {
  if (monthRank == null || tiers.isEmpty) return null;
  final idx = tiers.indexWhere((t) => t.containsRank(monthRank));
  if (idx < 0) return null;
  final t = tiers[idx];
  final end = t.rankEnd ?? t.rankStart;
  final start = t.rankStart;
  if (end <= start) return 1.0;
  return ((end - monthRank) / (end - start)).clamp(0.0, 1.0);
}

int? sortOrderForTierLabel(String? label, List<TierInfo> tiers) {
  if (label == null || label.isEmpty) return null;
  for (final t in tiers) {
    if (t.label == label) return t.sortOrder;
  }
  return null;
}
