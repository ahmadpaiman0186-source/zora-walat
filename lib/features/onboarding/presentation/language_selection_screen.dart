import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/locale/locale_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';

/// First-run language picker. Persists via [LocaleController] + onboarding flag.
class LanguageSelectionScreen extends StatefulWidget {
  const LanguageSelectionScreen({super.key});

  @override
  State<LanguageSelectionScreen> createState() =>
      _LanguageSelectionScreenState();
}

class _LanguageSelectionScreenState extends State<LanguageSelectionScreen> {
  late String _selected;
  bool _seeded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seeded) return;
    _seeded = true;
    final current = context.localeController.locale.languageCode;
    _selected = (current == 'fa' || current == 'ps') ? current : 'en';
  }

  Future<void> _continue() async {
    final code = _selected;
    final locale = Locale(code);
    await context.localeController.setLocale(locale);
    if (!mounted) return;
    await AppScope.of(context).onboardingPrefs.markLanguageOnboardingComplete();
    if (!mounted) return;
    context.go(AppRoutePaths.home);
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    final options = <_LangOption>[
      _LangOption('en', l10n.languageEnglish, 'English', false),
      _LangOption('fa', l10n.languageDari, 'دری', true),
      _LangOption('ps', l10n.languagePashto, 'پښتو', true),
    ];

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Text(
                l10n.chooseLanguageTitle,
                style: t.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l10n.languageOnboardingSubtitle,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: t.colorScheme.outline,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 28),
              Expanded(
                child: ListView.separated(
                  itemCount: options.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final o = options[i];
                    final selected = _selected == o.code;
                    return _LanguageTile(
                      option: o,
                      selected: selected,
                      onTap: () => setState(() => _selected = o.code),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _continue,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(54),
                ),
                child: Text(l10n.continueCta),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LangOption {
  const _LangOption(this.code, this.title, this.nativeLine, this.rtl);

  final String code;
  final String title;
  final String nativeLine;
  final bool rtl;
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final _LangOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Material(
      color: selected
          ? t.colorScheme.primary.withValues(alpha: 0.14)
          : t.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? t.colorScheme.primary : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? t.colorScheme.primary : t.colorScheme.outline,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      option.title,
                      style: t.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Directionality(
                      textDirection: option.rtl
                          ? TextDirection.rtl
                          : TextDirection.ltr,
                      child: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Text(
                          option.nativeLine,
                          style: t.textTheme.bodySmall?.copyWith(
                            color: t.colorScheme.outline,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                Icon(Icons.check_circle_rounded, color: t.colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }
}
