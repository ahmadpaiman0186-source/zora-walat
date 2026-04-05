import 'package:flutter/material.dart';

class LoyaltyPremiumProgressBar extends StatelessWidget {
  const LoyaltyPremiumProgressBar({
    super.key,
    required this.value,
    required this.label,
    this.subtitle,
    this.startColor,
    this.endColor,
  });

  final double value;
  final String label;
  final String? subtitle;
  final Color? startColor;
  final Color? endColor;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final v = value.clamp(0.0, 1.0);
    final sc = startColor ?? t.colorScheme.primary;
    final ec = endColor ?? t.colorScheme.tertiary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: t.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline,
              height: 1.35,
            ),
          ),
        ],
        const SizedBox(height: 10),
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: v),
          duration: const Duration(milliseconds: 720),
          curve: Curves.easeOutCubic,
          builder: (context, x, _) {
            return ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: Stack(
                children: [
                  Container(
                    height: 11,
                    width: double.infinity,
                    color: t.colorScheme.surfaceContainerHighest,
                  ),
                  FractionallySizedBox(
                    widthFactor: x,
                    alignment: Alignment.centerLeft,
                    child: Container(
                      height: 11,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [sc, ec]),
                        boxShadow: [
                          BoxShadow(
                            color: sc.withValues(alpha: 0.35),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
