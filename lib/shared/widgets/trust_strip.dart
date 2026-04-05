import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// Horizontal trust badges for checkout / success flows.
class TrustStrip extends StatelessWidget {
  const TrustStrip({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final items = [
      (l10n.trustSecurePayment, Icons.lock_rounded),
      (l10n.trustEncrypted, Icons.enhanced_encryption_outlined),
      (l10n.trustTransparentPricing, Icons.visibility_outlined),
      (l10n.trustLiveTracking, Icons.radar_rounded),
    ];

    if (compact) {
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.center,
        children: [
          for (final (label, icon) in items)
            _TrustChip(icon: icon, label: label, t: t),
        ],
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            _TrustChip(icon: items[i].$2, label: items[i].$1, t: t),
          ],
        ],
      ),
    );
  }
}

class _TrustChip extends StatelessWidget {
  const _TrustChip({
    required this.icon,
    required this.label,
    required this.t,
  });

  final IconData icon;
  final String label;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: t.colorScheme.primary.withValues(alpha: 0.22),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: t.colorScheme.primary),
          const SizedBox(width: 8),
          Text(
            label,
            style: t.textTheme.labelMedium?.copyWith(
              color: t.colorScheme.onSurface.withValues(alpha: 0.88),
              fontWeight: FontWeight.w600,
              letterSpacing: 0.15,
            ),
          ),
        ],
      ),
    );
  }
}
