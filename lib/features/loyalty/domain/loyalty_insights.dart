import 'loyalty_leaderboard_parse.dart';

/// Points needed to match the player one monthly rank above you (when on leaderboard).
int? pointsToNextRankUp({
  required int? myRank,
  required int myPoints,
  required String? myUserId,
  required List<LoyaltyUserBoardRow> board,
}) {
  if (myRank == null || board.isEmpty) return null;

  LoyaltyUserBoardRow? match;
  if (myUserId != null) {
    for (final r in board) {
      if (r.userId == myUserId) {
        match = r;
        break;
      }
    }
  }
  match ??= () {
    for (final r in board) {
      if (r.rank == myRank && r.points == myPoints) return r;
    }
    return null;
  }();

  if (match == null) return null;

  final ahead = board
      .where(
        (r) =>
            r.rank < match!.rank ||
            (r.rank == match.rank && r.points > match.points),
      )
      .toList()
    ..sort((a, b) {
      final rc = a.rank.compareTo(b.rank);
      if (rc != 0) return rc;
      return b.points.compareTo(a.points);
    });

  if (ahead.isEmpty) return null;
  final target = ahead.first;
  final gap = target.points - match.points;
  if (gap <= 0) return null;
  return gap;
}

/// Points gap and the rank you would tie if you match the next target's points.
({int gap, int targetRank})? pointsToNextRankDetail({
  required int? myRank,
  required int myPoints,
  required String? myUserId,
  required List<LoyaltyUserBoardRow> board,
}) {
  final g = pointsToNextRankUp(
    myRank: myRank,
    myPoints: myPoints,
    myUserId: myUserId,
    board: board,
  );
  if (g == null || myRank == null || board.isEmpty) return null;

  LoyaltyUserBoardRow? match;
  if (myUserId != null) {
    for (final r in board) {
      if (r.userId == myUserId) {
        match = r;
        break;
      }
    }
  }
  match ??= () {
    for (final r in board) {
      if (r.rank == myRank && r.points == myPoints) return r;
    }
    return null;
  }();
  if (match == null) return null;

  final ahead = board
      .where(
        (r) =>
            r.rank < match!.rank ||
            (r.rank == match.rank && r.points > match.points),
      )
      .toList()
    ..sort((a, b) {
      final rc = a.rank.compareTo(b.rank);
      if (rc != 0) return rc;
      return b.points.compareTo(a.points);
    });
  if (ahead.isEmpty) return null;
  final target = ahead.first;
  final gap = target.points - match.points;
  if (gap <= 0) return null;
  return (gap: gap, targetRank: target.rank);
}

class CompetitorBehind {
  CompetitorBehind({required this.rank, required this.points});

  final int rank;
  final int points;
}

CompetitorBehind? trailingCompetitor({
  required int? myRank,
  required int myPoints,
  required String? myUserId,
  required List<LoyaltyUserBoardRow> board,
}) {
  if (myRank == null || board.isEmpty) return null;

  final behind = board
      .where((r) {
        if (myUserId != null && r.userId == myUserId) return false;
        if (r.rank > myRank) return true;
        if (r.rank == myRank && r.points < myPoints) return true;
        return false;
      })
      .toList()
    ..sort((a, b) {
      final rc = a.rank.compareTo(b.rank);
      if (rc != 0) return rc;
      return b.points.compareTo(a.points);
    });

  if (behind.isEmpty) return null;
  return CompetitorBehind(rank: behind.first.rank, points: behind.first.points);
}

int? pointsToDropBehind({
  required int myPoints,
  required CompetitorBehind? behind,
}) {
  if (behind == null) return null;
  final gap = myPoints - behind.points;
  if (gap <= 0) return null;
  return gap;
}

int daysRemainingInUtcMonth(DateTime nowUtc) {
  final next = DateTime.utc(nowUtc.year, nowUtc.month + 1);
  return next.difference(nowUtc).inDays.clamp(0, 31);
}

int? groupPointsToNextRank({
  required String? groupId,
  required List<LoyaltyGroupBoardRow> board,
}) {
  return groupPointsToNextRankDetail(groupId: groupId, board: board)?.gap;
}

({int gap, int targetRank})? groupPointsToNextRankDetail({
  required String? groupId,
  required List<LoyaltyGroupBoardRow> board,
}) {
  if (groupId == null || board.isEmpty) return null;
  LoyaltyGroupBoardRow? mine;
  for (final r in board) {
    if (r.groupId == groupId) {
      mine = r;
      break;
    }
  }
  if (mine == null) return null;
  final ahead = board
      .where(
        (r) =>
            r.rank < mine!.rank ||
            (r.rank == mine.rank && r.points > mine.points),
      )
      .toList()
    ..sort((a, b) {
      final rc = a.rank.compareTo(b.rank);
      if (rc != 0) return rc;
      return b.points.compareTo(a.points);
    });
  if (ahead.isEmpty) return null;
  final g = ahead.first.points - mine.points;
  if (g <= 0) return null;
  return (gap: g, targetRank: ahead.first.rank);
}

/// Share of this month's group points (motivational, not a payout).
double? userShareOfGroupMonth({
  required int userMonth,
  required int groupMonth,
}) {
  if (groupMonth <= 0) return null;
  return (userMonth / groupMonth).clamp(0.0, 1.0);
}

/// Progress toward matching the points of the rank ahead (0–1).
double rankCloseProgress(int myPoints, ({int gap, int targetRank})? detail) {
  if (detail == null || detail.gap <= 0) return 0;
  final targetPts = myPoints + detail.gap;
  if (targetPts <= 0) return 0;
  return (myPoints / targetPts).clamp(0.0, 1.0);
}

/// Progress for family group toward the next group on the monthly board.
double groupClimbProgress(
  String? groupId,
  List<LoyaltyGroupBoardRow> board,
) {
  if (groupId == null || board.isEmpty) return 0;
  LoyaltyGroupBoardRow? mine;
  for (final r in board) {
    if (r.groupId == groupId) {
      mine = r;
      break;
    }
  }
  if (mine == null) return 0;
  final ahead = board
      .where(
        (r) =>
            r.rank < mine!.rank ||
            (r.rank == mine.rank && r.points > mine.points),
      )
      .toList()
    ..sort((a, b) {
      final rc = a.rank.compareTo(b.rank);
      if (rc != 0) return rc;
      return b.points.compareTo(a.points);
    });
  if (ahead.isEmpty) return 1.0;
  final t = ahead.first.points;
  if (t <= 0) return 0;
  return (mine.points / t).clamp(0.0, 1.0);
}

bool soloCarrierThisMonth({
  required int userMonth,
  required int groupMonth,
  required int otherMemberCount,
}) {
  return groupMonth > 0 && userMonth == groupMonth && otherMemberCount >= 0;
}
