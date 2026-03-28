import 'package:flutter/material.dart';

import '../locale/locale_scope.dart';
import '../../l10n/app_localizations.dart';

/// Opens a bottom sheet to pick English, Dari, or Pashto. Persists via [LocaleController].
Future<void> showLanguageSheet(BuildContext context) async {
  final controller = context.localeController;
  final l10n = AppLocalizations.of(context);

  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.chooseLanguageTitle,
                style: Theme.of(ctx).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.languageSheetSubtitle,
                style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                      color: Theme.of(ctx).colorScheme.outline,
                    ),
              ),
              const SizedBox(height: 16),
              _LanguageTile(
                title: l10n.languageEnglish,
                subtitle: 'English',
                selected: controller.locale.languageCode == 'en',
                onTap: () async {
                  await controller.setLocale(const Locale('en'));
                  if (ctx.mounted) Navigator.pop(ctx);
                },
              ),
              _LanguageTile(
                title: l10n.languageDari,
                subtitle: 'دری',
                selected: controller.locale.languageCode == 'fa',
                onTap: () async {
                  await controller.setLocale(const Locale('fa'));
                  if (ctx.mounted) Navigator.pop(ctx);
                },
              ),
              _LanguageTile(
                title: l10n.languagePashto,
                subtitle: 'پښتو',
                selected: controller.locale.languageCode == 'ps',
                onTap: () async {
                  await controller.setLocale(const Locale('ps'));
                  if (ctx.mounted) Navigator.pop(ctx);
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: selected
            ? t.colorScheme.primary.withValues(alpha: 0.15)
            : t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(
                  selected ? Icons.check_circle_rounded : Icons.language_rounded,
                  color: selected ? t.colorScheme.primary : t.colorScheme.outline,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: t.textTheme.titleSmall),
                      Text(
                        subtitle,
                        style: t.textTheme.bodySmall?.copyWith(
                          color: t.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
