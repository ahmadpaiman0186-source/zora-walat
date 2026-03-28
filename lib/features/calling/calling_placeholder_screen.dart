import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';

/// Placeholder for future international VoIP / carrier integrations.
class CallingPlaceholderScreen extends StatelessWidget {
  const CallingPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.callingTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            l10n.callingBody,
            textAlign: TextAlign.center,
            style: t.textTheme.bodyLarge?.copyWith(color: t.colorScheme.outline),
          ),
        ),
      ),
    );
  }
}
