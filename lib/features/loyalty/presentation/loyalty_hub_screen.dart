import 'dart:convert';
import 'dart:math' show max;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/auth/jwt_payload.dart';
import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/loyalty_insights.dart';
import '../domain/loyalty_leaderboard_parse.dart';
import '../domain/loyalty_tier_info.dart';
import '../domain/loyalty_tier_visual.dart';
import 'widgets/loyalty_achievements_strip.dart';
import 'widgets/loyalty_leaderboard_tile.dart';
import 'widgets/loyalty_premium_progress_bar.dart';
import 'widgets/loyalty_tier_hero.dart';

/// Family group + loyalty recognition (API: `/api/loyalty/*`).
class LoyaltyHubScreen extends StatefulWidget {
  const LoyaltyHubScreen({super.key, this.initialTabIndex = 0});

  /// 0 = you & family, 1 = leaderboard (deep links).
  final int initialTabIndex;

  @override
  State<LoyaltyHubScreen> createState() => _LoyaltyHubScreenState();
}

class _LoyaltyHubScreenState extends State<LoyaltyHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  Map<String, dynamic>? _summary;
  Map<String, dynamic>? _tiersBody;
  Map<String, dynamic>? _boardGroups;
  Map<String, dynamic>? _boardUsers;
  Map<String, dynamic>? _familyCtx;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final i = widget.initialTabIndex.clamp(0, 1);
    _tabs = TabController(length: 2, vsync: this, initialIndex: i);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = AppScope.of(context).apiService;
      final s = await api.getLoyaltySummary();
      final month = s['yearMonth'] as String?;
      final bundle = await Future.wait([
        api.getLoyaltyTiers(),
        api.getLoyaltyLeaderboard(scope: 'groups', month: month, limit: 50),
        api.getLoyaltyLeaderboard(scope: 'users', month: month, limit: 50),
        api.getMyFamilyGroup(),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = s;
        _tiersBody = bundle[0];
        _boardGroups = bundle[1];
        _boardUsers = bundle[2];
        _familyCtx = bundle[3];
      });
      await _evaluateLoyaltyNotifications(s);
    } on UnauthorizedException {
      if (!mounted) return;
      setState(() => _error = l10n.authRequiredMessage);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _evaluateLoyaltyNotifications(Map<String, dynamic> summary) async {
    if (!mounted) return;
    final hub = AppScope.of(context).notificationHub;
    final l10n = AppLocalizations.of(context);
    final prefs = await SharedPreferences.getInstance();
    const snapKey = 'zw_loyalty_notif_snap_v1';
    Map<String, dynamic>? old;
    final rawSnap = prefs.getString(snapKey);
    if (rawSnap != null && rawSnap.isNotEmpty) {
      try {
        old = jsonDecode(rawSnap) as Map<String, dynamic>;
      } catch (_) {
        old = null;
      }
    }

    final ym = summary['yearMonth'] as String?;
    final user = summary['user'] as Map<String, dynamic>?;
    final rankRaw = user?['monthRank'];
    final r = rankRaw == null ? null : (rankRaw as num).toInt();
    final life = (user?['lifetimePoints'] as num?)?.toInt() ?? 0;

    if (old != null &&
        old['yearMonth'] == ym &&
        old['monthRank'] != null &&
        r != null) {
      final or = (old['monthRank'] as num).toInt();
      if (r < or) {
        await hub.publishLoyalty(
          context,
          title: l10n.notifLoyaltyRankUpTitle,
          body: l10n.notifLoyaltyRankUpBody,
          tab: 1,
        );
      } else if (r > or) {
        await hub.publishLoyalty(
          context,
          title: l10n.notifLoyaltyRankDownTitle,
          body: l10n.notifLoyaltyRankDownBody,
          tab: 1,
        );
      }
    }

    final oldLife = (old?['lifetimePoints'] as num?)?.toInt() ?? 0;
    if (life >= 100 && oldLife < 100) {
      await hub.publishLoyalty(
        context,
        title: l10n.notifLoyaltyMilestoneTitle,
        body: l10n.notifLoyaltyMilestoneBody,
        tab: 0,
      );
    }

    final now = DateTime.now().toUtc();
    final days = daysRemainingInUtcMonth(now);
    final todayKey =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    final lastUrg = prefs.getString('zw_loyalty_urgency_last_day');
    if (days <= 7 && days > 0 && lastUrg != todayKey) {
      await hub.publishLoyalty(
        context,
        title: l10n.notifLoyaltyMonthUrgencyTitle,
        body: l10n.notifLoyaltyMonthUrgencyBody,
        tab: 1,
      );
      await prefs.setString('zw_loyalty_urgency_last_day', todayKey);
    }

    await prefs.setString(
      snapKey,
      jsonEncode({
        'yearMonth': ym,
        'monthRank': r,
        'lifetimePoints': life,
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final token = AppScope.authSessionOf(context).accessToken;

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, inner) => [
          SliverAppBar.large(
            pinned: true,
            title: Text(l10n.loyaltyHubTitle),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              onPressed: () => context.pop(),
            ),
            actions: [
              IconButton(
                tooltip: l10n.language,
                icon: const Icon(Icons.language_rounded),
                onPressed: () => showLanguageSheet(context),
              ),
              IconButton(
                tooltip: l10n.loyaltyRefresh,
                icon: const Icon(Icons.refresh_rounded),
                onPressed: _busy ? null : _load,
              ),
            ],
            bottom: TabBar(
              controller: _tabs,
              tabs: [
                Tab(text: l10n.loyaltyYouTab),
                Tab(text: l10n.loyaltyLeaderboardTab),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabs,
          children: [
            RefreshIndicator(
              onRefresh: _load,
              child: _YouTab(
                summary: _summary,
                tiersBody: _tiersBody,
                boardUsers: _boardUsers,
                boardGroups: _boardGroups,
                familyCtx: _familyCtx,
                accessToken: token,
                error: _error,
                busy: _busy,
                onRefresh: _load,
              ),
            ),
            RefreshIndicator(
              onRefresh: _load,
              child: _BoardTab(
                groups: _boardGroups,
                users: _boardUsers,
                summary: _summary,
                accessToken: token,
                error: _error,
                busy: _busy,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _YouTab extends StatelessWidget {
  const _YouTab({
    required this.summary,
    required this.tiersBody,
    required this.boardUsers,
    required this.boardGroups,
    required this.familyCtx,
    required this.accessToken,
    required this.error,
    required this.busy,
    required this.onRefresh,
  });

  final Map<String, dynamic>? summary;
  final Map<String, dynamic>? tiersBody;
  final Map<String, dynamic>? boardUsers;
  final Map<String, dynamic>? boardGroups;
  final Map<String, dynamic>? familyCtx;
  final String? accessToken;
  final String? error;
  final bool busy;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        Text(
          l10n.loyaltyHubSubtitle,
          style: t.textTheme.bodyMedium?.copyWith(
            color: t.colorScheme.outline,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 18),
        if (busy && summary == null)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          )
        else if (error != null)
          Text(error!, style: t.textTheme.bodyMedium)
        else if (summary != null) ...[
          _MomentumHeader(
            summary: summary!,
            l10n: l10n,
            t: t,
          ),
          const SizedBox(height: 18),
          _EngagementBody(
            summary: summary!,
            tiersBody: tiersBody,
            boardUsers: boardUsers,
            boardGroups: boardGroups,
            familyCtx: familyCtx,
            accessToken: accessToken,
            l10n: l10n,
            t: t,
          ),
          const SizedBox(height: 20),
          Text(
            l10n.loyaltyLegalFootnote,
            style: t.textTheme.labelSmall?.copyWith(
              color: t.colorScheme.outline,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 24),
          _FamilyActions(onRefresh: onRefresh),
        ],
      ],
    );
  }
}

class _MomentumHeader extends StatelessWidget {
  const _MomentumHeader({
    required this.summary,
    required this.l10n,
    required this.t,
  });

  final Map<String, dynamic> summary;
  final AppLocalizations l10n;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now().toUtc();
    final days = daysRemainingInUtcMonth(now);

    return Row(
      children: [
        Icon(
          Icons.calendar_month_rounded,
          size: 20,
          color: t.colorScheme.secondary,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            l10n.loyaltyDaysLeft(days),
            style: t.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _EngagementBody extends StatelessWidget {
  const _EngagementBody({
    required this.summary,
    required this.tiersBody,
    required this.boardUsers,
    required this.boardGroups,
    required this.familyCtx,
    required this.accessToken,
    required this.l10n,
    required this.t,
  });

  final Map<String, dynamic> summary;
  final Map<String, dynamic>? tiersBody;
  final Map<String, dynamic>? boardUsers;
  final Map<String, dynamic>? boardGroups;
  final Map<String, dynamic>? familyCtx;
  final String? accessToken;
  final AppLocalizations l10n;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    final user = summary['user'] as Map<String, dynamic>? ?? {};
    final life = (user['lifetimePoints'] as num?)?.toInt() ?? 0;
    final monthPts = (user['monthPoints'] as num?)?.toInt() ?? 0;
    final monthRank = user['monthRank'] == null
        ? null
        : (user['monthRank'] as num).toInt();

    final tiers = parseTierInfoList(tiersBody?['tiers'] as List<dynamic>?);
    final userBoard = parseUserBoard(boardUsers);
    final groupBoard = parseGroupBoard(boardGroups);
    final myId = jwtSubject(accessToken);

    final rankDetail = pointsToNextRankDetail(
      myRank: monthRank,
      myPoints: monthPts,
      myUserId: myId,
      board: userBoard,
    );
    final nextTier = computeNextTierClimb(monthRank, tiers);
    final tierBand = tierBandProgressTowardTop(monthRank, tiers);
    final rankProg = rankCloseProgress(monthPts, rankDetail);
    final tierRunwayProg = nextTier == null
        ? (tierBand ?? 0.0)
        : (1.0 / (1 + nextTier.ranksToClimb)).clamp(0.0, 1.0);

    final behind = trailingCompetitor(
      myRank: monthRank,
      myPoints: monthPts,
      myUserId: myId,
      board: userBoard,
    );
    final cushion = pointsToDropBehind(myPoints: monthPts, behind: behind);
    final showChasePack = behind != null && cushion != null;
    final tightField = cushion != null &&
        monthPts > 0 &&
        cushion <= (monthPts * 0.2).clamp(3.0, double.infinity);

    final rec = summary['recognition'] as Map<String, dynamic>?;
    final tierMap = rec?['currentTier'] as Map<String, dynamic>?;
    final tierLabel = tierMap?['label'] as String? ?? '';
    final tierDesc = tierMap?['description'] as String?;
    final sortOrder =
        sortOrderForTierLabel(tierLabel, tiers) ?? 99;
    final visual = LoyaltyTierVisual.forTierLabel(tierLabel, sortOrder);

    final group = summary['group'] as Map<String, dynamic>?;
    final groupId = group?['groupId'] as String?;
    final gMonth = (group?['monthPoints'] as num?)?.toInt() ?? 0;
    final gLife = (group?['lifetimePoints'] as num?)?.toInt() ?? 0;
    final groupProg = groupClimbProgress(groupId, groupBoard);
    final groupGap = groupPointsToNextRankDetail(
      groupId: groupId,
      board: groupBoard,
    );

    final otherMembers =
        (familyCtx?['membership'] as Map<String, dynamic>?)?[
                'otherMemberCount'] as num? ??
            0;
    final share = userShareOfGroupMonth(userMonth: monthPts, groupMonth: gMonth);

    final achievements = <LoyaltyAchievement>[
      LoyaltyAchievement(
        icon: Icons.bolt_rounded,
        title: l10n.loyaltyAchFirstOrderTitle,
        subtitle: l10n.loyaltyAchFirstOrderSub,
        unlocked: life >= 1,
      ),
      LoyaltyAchievement(
        icon: Icons.emoji_events_outlined,
        title: l10n.loyaltyAchCenturyTitle,
        subtitle: l10n.loyaltyAchCenturySub,
        unlocked: life >= 100,
      ),
      LoyaltyAchievement(
        icon: Icons.groups_2_outlined,
        title: l10n.loyaltyAchGroupTitle,
        subtitle: l10n.loyaltyAchGroupSub,
        unlocked: gLife >= 250,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _StatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.loyaltyLifetimePoints,
                style: t.textTheme.labelLarge?.copyWith(
                  color: t.colorScheme.outline,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '$life',
                style: t.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: t.colorScheme.secondary,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _MiniStat(
                      label: l10n.loyaltyMonthPoints,
                      value: '$monthPts',
                      t: t,
                    ),
                  ),
                  Expanded(
                    child: _MiniStat(
                      label: l10n.loyaltyMonthRank,
                      value:
                          monthRank != null ? '#$monthRank' : '—',
                      t: t,
                    ),
                  ),
                ],
              ),
              if (monthRank != null) ...[
                const SizedBox(height: 10),
                Text(
                  l10n.loyaltyYouPlacement('#$monthRank'),
                  style: t.textTheme.labelMedium?.copyWith(
                    color: t.colorScheme.outline,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (tightField || showChasePack) ...[
          const SizedBox(height: 12),
          _UrgencyCallout(
            t: t,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (tightField)
                  Text(
                    l10n.loyaltyTightBehind,
                    style: t.textTheme.bodySmall?.copyWith(height: 1.45),
                  ),
                if (showChasePack) ...[
                  if (tightField) const SizedBox(height: 8),
                  Text(
                    l10n.loyaltyChasingPack(behind.rank, cushion),
                    style: t.textTheme.bodySmall?.copyWith(height: 1.45),
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        LoyaltyTierHero(
          visual: visual,
          title: tierLabel.isEmpty ? l10n.loyaltyRecognitionBand : tierLabel,
          description: tierDesc,
        ),
        const SizedBox(height: 18),
        LoyaltyAchievementsStrip(l10n: l10n, items: achievements),
        const SizedBox(height: 20),
        _StatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LoyaltyPremiumProgressBar(
                value: rankProg,
                label: l10n.loyaltyProgressRankTitle,
                subtitle: rankDetail != null
                    ? l10n.loyaltyPointsToRankAhead(
                        rankDetail.gap,
                        rankDetail.targetRank,
                      )
                    : null,
                startColor: visual.accent,
                endColor: t.colorScheme.primary,
              ),
              const SizedBox(height: 22),
              LoyaltyPremiumProgressBar(
                value: tierRunwayProg,
                label: l10n.loyaltyProgressTierTitle,
                subtitle: nextTier != null
                    ? l10n.loyaltyRanksToTier(
                        nextTier.ranksToClimb,
                        nextTier.targetTierLabel,
                      )
                    : l10n.loyaltyProgressClimb,
                startColor: t.colorScheme.tertiary,
                endColor: visual.accent,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        LoyaltyPremiumProgressBar(
          value: () {
            var top = 0;
            for (final r in userBoard) {
              top = max(top, r.points);
            }
            if (top <= 0) return monthPts > 0 ? 0.25 : 0.0;
            return (monthPts / top).clamp(0.0, 1.0);
          }(),
          label: l10n.loyaltyProgressYourMonthTitle,
          subtitle: monthPts > 0
              ? '${l10n.loyaltyMonthPoints}: $monthPts'
              : l10n.loyaltyProgressClimb,
          startColor: t.colorScheme.secondary,
          endColor: t.colorScheme.primary,
        ),
        if (group != null) ...[
          const SizedBox(height: 18),
          _StatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  group['name'] as String? ?? '—',
                  style: t.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${l10n.loyaltyMonthPoints}: $gMonth · ${l10n.loyaltyGroupRank}: ${group['monthRank'] != null ? '#${group['monthRank']}' : '—'}',
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                  ),
                ),
                const SizedBox(height: 14),
                LoyaltyPremiumProgressBar(
                  value: groupProg,
                  label: l10n.loyaltyProgressGroupTitle,
                  subtitle: groupGap != null
                      ? l10n.loyaltyGroupBoardGap(groupGap.gap)
                      : '${l10n.loyaltyGroupPoints}: $gLife',
                  startColor: t.colorScheme.primary,
                  endColor: t.colorScheme.tertiary,
                ),
                if (share != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    l10n.loyaltyYourShareOfFamily((share * 100).round()),
                    style: t.textTheme.bodySmall?.copyWith(height: 1.4),
                  ),
                ],
                if (share != null && share >= 1.0 && gMonth > 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    otherMembers.toInt() == 0
                        ? l10n.loyaltySoloFamilyMonth
                        : l10n.loyaltyCarryingMost,
                    style: t.textTheme.labelMedium?.copyWith(
                      color: t.colorScheme.secondary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _UrgencyCallout extends StatelessWidget {
  const _UrgencyCallout({required this.t, required this.child});

  final ThemeData t;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: t.colorScheme.secondaryContainer.withValues(alpha: 0.35),
        border: Border.all(
          color: t.colorScheme.secondary.withValues(alpha: 0.35),
        ),
      ),
      child: child,
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value, required this.t});

  final String label;
  final String value;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: t.textTheme.labelSmall?.copyWith(color: t.colorScheme.outline),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: t.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.15)),
      ),
      child: child,
    );
  }
}

class _BoardTab extends StatelessWidget {
  const _BoardTab({
    required this.groups,
    required this.users,
    required this.summary,
    required this.accessToken,
    required this.error,
    required this.busy,
  });

  final Map<String, dynamic>? groups;
  final Map<String, dynamic>? users;
  final Map<String, dynamic>? summary;
  final String? accessToken;
  final String? error;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    if (busy && groups == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [Center(child: Text(error!))],
      );
    }

    final myUserId = jwtSubject(accessToken);
    final gid =
        (summary?['group'] as Map<String, dynamic>?)?['groupId'] as String?;

    final gEntries = (groups?['entries'] as List<dynamic>?) ?? const [];
    final uEntries = (users?['entries'] as List<dynamic>?) ?? const [];

    Color? medalFor(int r) {
      if (r == 1) return const Color(0xFFE6C76A);
      if (r == 2) return const Color(0xFFC0C8D4);
      if (r == 3) return const Color(0xFFB87333);
      return null;
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        Text(
          l10n.loyaltyTopGroups,
          style: t.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        ...gEntries.take(12).map((e) {
          final m = e as Map<String, dynamic>;
          final grp = m['group'] as Map<String, dynamic>? ?? {};
          final id = grp['id'] as String?;
          final name = grp['name'] as String? ?? '—';
          final rank = m['rank'] as int? ?? 0;
          return LoyaltyLeaderboardTile(
            rank: rank,
            title: name,
            subtitle: '${m['points'] ?? 0} pts · ${l10n.loyaltyRankBadge}',
            highlight: id != null && id == gid,
            medal: medalFor(rank),
          );
        }),
        const SizedBox(height: 28),
        Text(
          l10n.loyaltyTopMembers,
          style: t.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        ...uEntries.take(12).map((e) {
          final m = e as Map<String, dynamic>;
          final id = m['userId'] as String? ?? '';
          final short =
              id.length > 8 ? '…${id.substring(id.length - 6)}' : id;
          final rank = m['rank'] as int? ?? 0;
          return LoyaltyLeaderboardTile(
            rank: rank,
            title: short,
            subtitle: '${m['points'] ?? 0} pts · ${l10n.loyaltyRankBadge}',
            highlight: myUserId != null && id == myUserId,
            medal: medalFor(rank),
          );
        }),
        const SizedBox(height: 24),
        Text(
          l10n.loyaltyLegalFootnote,
          style: t.textTheme.labelSmall?.copyWith(color: t.colorScheme.outline),
        ),
      ],
    );
  }
}

class _FamilyActions extends StatefulWidget {
  const _FamilyActions({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  State<_FamilyActions> createState() => _FamilyActionsState();
}

class _FamilyActionsState extends State<_FamilyActions> {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final t = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.loyaltyInviteHint,
          style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.outline),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () async {
            final name = await showDialog<String>(
              context: context,
              builder: (ctx) {
                final c = TextEditingController();
                return AlertDialog(
                  title: Text(l10n.loyaltyCreateGroup),
                  content: TextField(
                    controller: c,
                    decoration: InputDecoration(hintText: l10n.appTitle),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text(l10n.cancel),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(ctx, c.text.trim()),
                      child: Text(l10n.continueCta),
                    ),
                  ],
                );
              },
            );
            if (!context.mounted || name == null || name.isEmpty) return;
            try {
              await AppScope.of(context).apiService.createFamilyGroup(name);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.done)),
                );
              }
              await widget.onRefresh();
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$e')),
                );
              }
            }
          },
          child: Text(l10n.loyaltyCreateGroup),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () async {
            final code = await showDialog<String>(
              context: context,
              builder: (ctx) {
                final c = TextEditingController();
                return AlertDialog(
                  title: Text(l10n.loyaltyJoinGroup),
                  content: TextField(
                    controller: c,
                    decoration: const InputDecoration(),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text(l10n.cancel),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(ctx, c.text.trim()),
                      child: Text(l10n.continueCta),
                    ),
                  ],
                );
              },
            );
            if (!context.mounted || code == null || code.isEmpty) return;
            try {
              await AppScope.of(context).apiService.joinFamilyGroup(code);
              await widget.onRefresh();
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$e')),
                );
              }
            }
          },
          child: Text(l10n.loyaltyJoinGroup),
        ),
        const SizedBox(height: 10),
        TextButton(
          onPressed: () async {
            try {
              await AppScope.of(context).apiService.leaveFamilyGroup();
              await widget.onRefresh();
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$e')),
                );
              }
            }
          },
          child: Text(l10n.loyaltyLeaveGroup),
        ),
        TextButton(
          onPressed: () async {
            try {
              await AppScope.of(context).apiService.dissolveFamilyGroup();
              await widget.onRefresh();
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$e')),
                );
              }
            }
          },
          child: Text(
            l10n.loyaltyDissolveGroup,
            style: TextStyle(color: t.colorScheme.error),
          ),
        ),
      ],
    );
  }
}
