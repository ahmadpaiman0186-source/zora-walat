import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../features/telecom/domain/airtime_offer.dart';
import '../../features/telecom/domain/pricing_engine.dart';
import '../../l10n/app_localizations.dart';

/// Fixed-size tap target — **no InkWell / Material splash** (Flutter web stable).
class AirtimeAmountTile extends StatelessWidget {
  const AirtimeAmountTile({
    super.key,
    required this.offer,
    required this.selected,
    required this.onTap,
  });

  final AirtimeOffer offer;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final cs = t.colorScheme;
    final price = NumberFormat.simpleCurrency(name: 'USD').format(
      offer.finalUsdCents / 100.0,
    );
    final marginPct =
        (PricingEngine.minimumMarginAfterCosts * 100).round().toString();

    return Semantics(
      button: true,
      label: '${offer.labelShort}, $price',
      child: SizedBox(
        width: 104,
        height: 120,
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color:
                    selected ? cs.primary : cs.outline.withValues(alpha: 0.35),
                width: selected ? 2 : 1,
              ),
              color: selected
                  ? cs.primary.withValues(alpha: 0.12)
                  : cs.surfaceContainerHighest,
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    offer.labelShort,
                    style: t.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.telecomVoiceBundle,
                    style: t.textTheme.labelSmall?.copyWith(color: cs.outline),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    price,
                    style: t.textTheme.titleSmall?.copyWith(
                      color: cs.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    l10n.telecomMarginNote(marginPct),
                    style: t.textTheme.labelSmall?.copyWith(
                      color: cs.outline.withValues(alpha: 0.85),
                      fontSize: 10,
                    ),
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
