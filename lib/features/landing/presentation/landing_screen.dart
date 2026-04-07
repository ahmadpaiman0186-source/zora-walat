import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_router.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';
import 'widgets/landing_content.dart';
import 'widgets/landing_how_it_works.dart';

/// Public marketing landing for web (and deep links to `/`).
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  static const double _maxContentWidth = 1040;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0E12),
              Color(0xFF0F1419),
              Color(0xFF121A22),
            ],
          ),
        ),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              backgroundColor: const Color(0xFF0F1419).withValues(alpha: 0.92),
              surfaceTintColor: Colors.transparent,
              title: Text(
                l10n.landingNavBrand,
                style: t.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                ),
              ),
              actions: [
                IconButton(
                  tooltip: l10n.language,
                  icon: const Icon(Icons.language_rounded),
                  onPressed: () => showLanguageSheet(context),
                ),
                const SizedBox(width: 4),
              ],
            ),
            SliverToBoxAdapter(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: _maxContentWidth),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 48),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final twoCol = constraints.maxWidth >= 880;
                            if (!twoCol) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const LandingHero(),
                                  const SizedBox(height: 28),
                                  _CtaRow(l10n: l10n),
                                  const SizedBox(height: 32),
                                  const LandingLanguageBlurb(),
                                ],
                              );
                            }
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(flex: 11, child: const LandingHero()),
                                const SizedBox(width: 40),
                                Expanded(
                                  flex: 10,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      _CtaRow(l10n: l10n),
                                      const SizedBox(height: 24),
                                      const LandingLanguageBlurb(),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 40),
                        const LandingWhyGrid(),
                        const SizedBox(height: 40),
                        const LandingHowItWorks(),
                        const SizedBox(height: 48),
                        Text(
                          l10n.landingFooterNote,
                          textAlign: TextAlign.center,
                          style: t.textTheme.bodySmall?.copyWith(
                            color: t.colorScheme.outline.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CtaRow extends StatelessWidget {
  const _CtaRow({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);

    return LayoutBuilder(
      builder: (context, c) {
        final row = c.maxWidth >= 420;
        final getStarted = FilledButton(
          onPressed: () => context.push(AppRoutePaths.signUp),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          ),
          child: Text(l10n.landingCtaGetStarted),
        );
        final signIn = OutlinedButton(
          onPressed: () => context.push(AppRoutePaths.signIn),
          style: OutlinedButton.styleFrom(
            foregroundColor: t.colorScheme.primary,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            side: BorderSide(color: t.colorScheme.primary.withValues(alpha: 0.65)),
          ),
          child: Text(l10n.landingCtaSignIn),
        );

        if (row) {
          return Row(
            children: [
              Expanded(child: getStarted),
              const SizedBox(width: 16),
              Expanded(child: signIn),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            getStarted,
            const SizedBox(height: 12),
            signIn,
          ],
        );
      },
    );
  }
}
