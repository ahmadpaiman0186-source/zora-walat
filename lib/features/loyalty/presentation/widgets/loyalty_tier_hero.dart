import 'package:flutter/material.dart';

import '../../domain/loyalty_tier_visual.dart';

class LoyaltyTierHero extends StatelessWidget {
  const LoyaltyTierHero({
    super.key,
    required this.visual,
    required this.title,
    this.description,
  });

  final LoyaltyTierVisual visual;
  final String title;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            visual.glow.withValues(alpha: 0.45),
            t.colorScheme.surfaceContainerHighest,
            t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.92),
          ],
        ),
        border: Border.all(color: visual.accent.withValues(alpha: 0.45)),
        boxShadow: [
          BoxShadow(
            color: visual.glow.withValues(alpha: 0.35),
            blurRadius: 22,
            spreadRadius: 0,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  visual.accent.withValues(alpha: 0.35),
                  visual.accent.withValues(alpha: 0.08),
                ],
              ),
              border: Border.all(color: visual.accent.withValues(alpha: 0.55)),
            ),
            child: Icon(visual.badgeIcon, size: 32, color: visual.accent),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: t.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                    color: t.colorScheme.onSurface,
                  ),
                ),
                if (description != null && description!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    description!,
                    style: t.textTheme.bodyMedium?.copyWith(
                      color: t.colorScheme.outline,
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
