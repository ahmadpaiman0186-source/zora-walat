import 'package:flutter/material.dart';

import '../../../../l10n/app_localizations.dart';

class InternationalPlaceholderTab extends StatelessWidget {
  const InternationalPlaceholderTab({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.public_rounded, size: 56, color: t.colorScheme.outline),
            const SizedBox(height: 20),
            Text(
              l10n.intlTabHeadline,
              style: t.textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              l10n.intlTabBody,
              style: t.textTheme.bodyLarge?.copyWith(
                color: t.colorScheme.outline,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
