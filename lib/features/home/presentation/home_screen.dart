import 'package:flutter/material.dart';

import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';
import '../../telecom/presentation/telecom_hub_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Zora-Walat', style: t.textTheme.headlineSmall),
                        const SizedBox(height: 4),
                        Text(
                          l10n.telecomHomeSubtitle,
                          style: t.textTheme.bodyMedium?.copyWith(
                            color: t.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: l10n.language,
                    icon: const Icon(Icons.language_rounded),
                    onPressed: () => showLanguageSheet(context),
                  ),
                  IconButton(
                    tooltip: l10n.help,
                    onPressed: () => _showHelp(context),
                    icon: const Icon(Icons.help_outline_rounded),
                  ),
                ],
              ),
            ),
            const Expanded(child: TelecomHubScreen()),
          ],
        ),
      ),
    );
  }

  void _showHelp(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.aboutTitle, style: Theme.of(ctx).textTheme.titleLarge),
            const SizedBox(height: 12),
            Text(
              l10n.aboutBody,
              style: Theme.of(ctx).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Text(
              l10n.aboutDevHint,
              style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                    color: Theme.of(ctx).colorScheme.outline,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
