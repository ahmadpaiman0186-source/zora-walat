import 'package:flutter/material.dart';

import '../../../../l10n/app_localizations.dart';

/// Hero, trust line, language blurb, and “why us” grid — separated for readability.
class LandingHero extends StatelessWidget {
  const LandingHero({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: t.colorScheme.primary.withValues(alpha: 0.35),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: t.colorScheme.primary.withValues(alpha: 0.12),
                blurRadius: 32,
                spreadRadius: 4,
              ),
            ],
          ),
          child: Icon(
            Icons.bolt_rounded,
            size: 40,
            color: t.colorScheme.primary,
          ),
        ),
        const SizedBox(height: 28),
        Text(
          l10n.landingHeroTitle,
          style: t.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w700,
            height: 1.15,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.landingHeroSubtitle,
          style: t.textTheme.bodyLarge?.copyWith(
            color: t.colorScheme.outline,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          l10n.landingTrustBadge,
          style: t.textTheme.labelLarge?.copyWith(
            color: t.colorScheme.secondary.withValues(alpha: 0.95),
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}

class LandingLanguageBlurb extends StatelessWidget {
  const LandingLanguageBlurb({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.translate_rounded, color: t.colorScheme.primary, size: 22),
              const SizedBox(width: 10),
              Text(
                l10n.landingLanguagesTitle,
                style: t.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            l10n.landingLanguagesBody,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class LandingWhyGrid extends StatelessWidget {
  const LandingWhyGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    final items = <_WhyItem>[
      _WhyItem(Icons.flash_on_rounded, l10n.landingWhyFastTitle, l10n.landingWhyFastBody),
      _WhyItem(Icons.lock_outline_rounded, l10n.landingWhySecureTitle, l10n.landingWhySecureBody),
      _WhyItem(Icons.payments_outlined, l10n.landingWhyPricingTitle, l10n.landingWhyPricingBody),
      _WhyItem(Icons.language_rounded, l10n.landingWhyLangTitle, l10n.landingWhyLangBody),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 720;
        final child = wide
            ? Wrap(
                spacing: 16,
                runSpacing: 16,
                children: items
                    .map(
                      (e) => SizedBox(
                        width: (constraints.maxWidth - 16) / 2,
                        child: _WhyCard(item: e),
                      ),
                    )
                    .toList(),
              )
            : Column(
                children: [
                  for (final e in items) ...[
                    _WhyCard(item: e),
                    const SizedBox(height: 12),
                  ],
                ],
              );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.landingWhyTitle,
              style: t.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            child,
          ],
        );
      },
    );
  }
}

class _WhyItem {
  const _WhyItem(this.icon, this.title, this.body);
  final IconData icon;
  final String title;
  final String body;
}

class _WhyCard extends StatelessWidget {
  const _WhyCard({required this.item});

  final _WhyItem item;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(item.icon, color: t.colorScheme.primary, size: 26),
          const SizedBox(height: 12),
          Text(
            item.title,
            style: t.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            item.body,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
