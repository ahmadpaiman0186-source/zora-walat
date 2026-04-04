import 'package:flutter/material.dart';

import '../../../../l10n/app_localizations.dart';

class InternationalPlaceholderTab extends StatelessWidget {
  const InternationalPlaceholderTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            color: t.colorScheme.surfaceContainerHighest,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(
                color: t.colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 36, 28, 36),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: t.colorScheme.primary.withValues(alpha: 0.15),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Icon(
                        Icons.public_rounded,
                        size: 44,
                        color: t.colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Text(
                    l10n.intlTabHeadline,
                    style: t.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    l10n.intlTabBody,
                    style: t.textTheme.bodyLarge?.copyWith(
                      color: t.colorScheme.outline,
                      height: 1.45,
                    ),
                    textAlign: TextAlign.center,
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
