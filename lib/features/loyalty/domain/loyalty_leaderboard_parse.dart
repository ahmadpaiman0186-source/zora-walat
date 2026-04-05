typedef LoyaltyUserBoardRow = ({int rank, int points, String? userId});
typedef LoyaltyGroupBoardRow = ({
  int rank,
  int points,
  String? groupId,
  String? name,
});

List<LoyaltyUserBoardRow> parseUserBoard(Map<String, dynamic>? body) {
  final list = (body?['entries'] as List<dynamic>?) ?? const [];
  return list.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    return (
      rank: (m['rank'] as num?)?.toInt() ?? 0,
      points: (m['points'] as num?)?.toInt() ?? 0,
      userId: m['userId'] as String?,
    );
  }).toList();
}

List<LoyaltyGroupBoardRow> parseGroupBoard(Map<String, dynamic>? body) {
  final list = (body?['entries'] as List<dynamic>?) ?? const [];
  return list.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    final g = m['group'] as Map<String, dynamic>?;
    return (
      rank: (m['rank'] as num?)?.toInt() ?? 0,
      points: (m['points'] as num?)?.toInt() ?? 0,
      groupId: g?['id'] as String?,
      name: g?['name'] as String?,
    );
  }).toList();
}
