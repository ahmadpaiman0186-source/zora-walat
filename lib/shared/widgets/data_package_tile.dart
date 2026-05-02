import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../features/telecom/domain/data_package_offer.dart';
import '../../features/telecom/domain/data_package_period.dart';
import '../../features/telecom/presentation/data_package_l10n.dart';
import '../../l10n/app_localizations.dart';

/// No ink / hover stack — **GestureDetector + DecoratedBox** only.
class DataPackageTile extends StatelessWidget {
  const DataPackageTile({
    super.key,
    required this.offer,
    required this.selected,
    required this.onTap,
  });

  final DataPackageOffer offer;
  final bool selected;
  final VoidCallback onTap;

  String _periodName(DataPackagePeriod p, AppLocalizations l10n) {
    return switch (p) {
      DataPackagePeriod.daily => l10n.periodDaily,
      DataPackagePeriod.weekly => l10n.periodWeekly,
      DataPackagePeriod.monthly => l10n.periodMonthly,
    };
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final cs = t.colorScheme;
    final price = NumberFormat.simpleCurrency(name: 'USD').format(
      offer.finalUsdCents / 100.0,
    );

    return Semantics(
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 96, minWidth: 200),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color:
                    selected ? cs.primary : cs.outline.withValues(alpha: 0.35),
                width: selected ? 2 : 1,
              ),
              color: selected
                  ? cs.primary.withValues(alpha: 0.1)
                  : cs.surfaceContainerHighest,
              boxShadow: offer.isBestValue && !selected
                  ? [
                      BoxShadow(
                        color: cs.secondary.withValues(alpha: 0.15),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ]
                  : null,
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          offer.localizedDataLabel(l10n),
                          style: t.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (offer.isBestValue)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: cs.secondary.withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            l10n.bestValueBadge,
                            style: t.textTheme.labelSmall?.copyWith(
                              color: cs.secondary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${_periodName(offer.period, l10n)} · ${offer.localizedValidity(l10n)}',
                    style: t.textTheme.bodyMedium?.copyWith(color: cs.outline),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        price,
                        style: t.textTheme.titleMedium?.copyWith(
                          color: cs.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Icon(
                        selected
                            ? Icons.check_circle_rounded
                            : Icons.radio_button_unchecked_rounded,
                        color: selected ? cs.primary : cs.outline,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
