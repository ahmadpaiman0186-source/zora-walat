import 'package:flutter/material.dart';

import '../../../../l10n/app_localizations.dart';

class LoyaltyAchievement {
  LoyaltyAchievement({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.unlocked,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool unlocked;
}

class LoyaltyAchievementsStrip extends StatelessWidget {
  const LoyaltyAchievementsStrip({
    super.key,
    required this.l10n,
    required this.items,
  });

  final AppLocalizations l10n;
  final List<LoyaltyAchievement> items;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final visible = items.where((e) => e.unlocked).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.loyaltyAchievementsHeading,
          style: t.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
    ),
        const SizedBox(height: 12),
        SizedBox(
          height: 112,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: visible.length,
            separatorBuilder: (_, index) =>
                SizedBox(width: 12, key: ValueKey('loy-ach-$index')),
            itemBuilder: (context, i) {
              final a = visible[i];
              return _AchCard(achievement: a);
            },
          ),
        ),
      ],
    );
  }
}

class _AchCard extends StatelessWidget {
  const _AchCard({required this.achievement});

  final LoyaltyAchievement achievement;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final a = achievement;
    return Container(
      width: 200,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: t.colorScheme.surfaceContainerHighest,
        border: Border.all(
          color: t.colorScheme.primary.withValues(alpha: 0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(a.icon, color: t.colorScheme.primary, size: 22),
          const SizedBox(height: 8),
          Text(
            a.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: t.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: Text(
              a.subtitle,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
