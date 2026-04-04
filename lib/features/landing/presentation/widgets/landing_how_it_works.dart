import 'package:flutter/material.dart';

import '../../../../l10n/app_localizations.dart';

/// Three-step summary aligned with recharge → review → checkout flow.
class LandingHowItWorks extends StatelessWidget {
  const LandingHowItWorks({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    final steps = <_Step>[
      _Step('1', l10n.landingHowStep1Title, l10n.landingHowStep1Body, Icons.phone_android_rounded),
      _Step('2', l10n.landingHowStep2Title, l10n.landingHowStep2Body, Icons.credit_card_rounded),
      _Step('3', l10n.landingHowStep3Title, l10n.landingHowStep3Body, Icons.send_rounded),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final useRow = constraints.maxWidth >= 900;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.landingHowTitle,
              style: t.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            if (useRow)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var i = 0; i < steps.length; i++) ...[
                    Expanded(child: _StepCard(step: steps[i], t: t)),
                    if (i < steps.length - 1) const SizedBox(width: 16),
                  ],
                ],
              )
            else
              Column(
                children: [
                  for (var i = 0; i < steps.length; i++) ...[
                    _StepCard(step: steps[i], t: t),
                    if (i < steps.length - 1) const SizedBox(height: 12),
                  ],
                ],
              ),
          ],
        );
      },
    );
  }
}

class _Step {
  const _Step(this.badge, this.title, this.body, this.icon);
  final String badge;
  final String title;
  final String body;
  final IconData icon;
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.step, required this.t});

  final _Step step;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: t.colorScheme.primary.withValues(alpha: 0.2),
                child: Text(
                  step.badge,
                  style: t.textTheme.labelLarge?.copyWith(
                    color: t.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Icon(step.icon, size: 22, color: t.colorScheme.primary),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            step.title,
            style: t.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            step.body,
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
