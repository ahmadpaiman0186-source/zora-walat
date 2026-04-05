import 'package:flutter/material.dart';

/// Premium tier identity (client-side; matches default server tier labels).
class LoyaltyTierVisual {
  const LoyaltyTierVisual({
    required this.accent,
    required this.glow,
    required this.badgeIcon,
    required this.badgeLabelKey,
  });

  final Color accent;
  final Color glow;
  final IconData badgeIcon;

  /// `null` → use API label string directly.
  final String? badgeLabelKey;

  static LoyaltyTierVisual forTierLabel(String? label, int sortOrder) {
    final l = (label ?? '').toLowerCase();
    if (l.contains('premier')) {
      return const LoyaltyTierVisual(
        accent: Color(0xFFE8D5A3),
        glow: Color(0x33FFD700),
        badgeIcon: Icons.diamond_outlined,
        badgeLabelKey: null,
      );
    }
    if (l.contains('gold')) {
      return const LoyaltyTierVisual(
        accent: Color(0xFFE6C76A),
        glow: Color(0x33E6C76A),
        badgeIcon: Icons.workspace_premium_outlined,
        badgeLabelKey: null,
      );
    }
    if (l.contains('silver')) {
      return const LoyaltyTierVisual(
        accent: Color(0xFFC0C8D4),
        glow: Color(0x33B0BEC8),
        badgeIcon: Icons.military_tech_outlined,
        badgeLabelKey: null,
      );
    }
    if (l.contains('member')) {
      return const LoyaltyTierVisual(
        accent: Color(0xFF8FA7C4),
        glow: Color(0x228FA7C4),
        badgeIcon: Icons.verified_outlined,
        badgeLabelKey: null,
      );
    }
    return LoyaltyTierVisual(
      accent: const Color(0xFF9DB8E8),
      glow: const Color(0x229DB8E8),
      badgeIcon: Icons.stars_rounded,
      badgeLabelKey: null,
    );
  }
}
