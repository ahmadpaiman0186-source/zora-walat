import 'package:flutter/material.dart';

class LoyaltyLeaderboardTile extends StatelessWidget {
  const LoyaltyLeaderboardTile({
    super.key,
    required this.rank,
    required this.title,
    required this.subtitle,
    this.highlight = false,
    this.medal,
  });

  final int rank;
  final String title;
  final String subtitle;
  final bool highlight;
  final Color? medal;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: highlight
            ? t.colorScheme.primaryContainer.withValues(alpha: 0.28)
            : t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: (medal ?? t.colorScheme.primary).withValues(
                    alpha: 0.16,
                  ),
                  border: Border.all(
                    color: (medal ?? t.colorScheme.primary).withValues(
                      alpha: 0.5,
                    ),
                  ),
                ),
                child: Text(
                  '#$rank',
                  style: t.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: medal ?? t.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: t.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: t.textTheme.bodySmall?.copyWith(
                        color: t.colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
